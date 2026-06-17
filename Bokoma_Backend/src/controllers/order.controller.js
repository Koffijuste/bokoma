// bokoma_backend/src/controllers/order.controller.js
// ============================================================================
// 📦 ORDER CONTROLLER - Gestion des commandes
// ============================================================================

const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { decrementStock, restoreStock, checkAvailability } = require('../services/inventory.service');
const { initializePayment, verifyPayment } = require('../services/payment.service');
const { sendOrderConfirmation, sendOrderStatusUpdate } = require('../services/email.service');

console.log('📦 [OrderController] Loaded');

// ============================================================================
// 🔹 HELPER: Extraire userId de req.user
// ============================================================================
const getUserId = (req) => req.user?.userId || req.user?._id?.toString();

// ============================================================================
// POST /api/v1/orders — Créer une commande (checkout)
// ============================================================================
exports.createOrder = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return next(new AppError('Utilisateur non authentifié', 401));

    const { shipping, payment, notes } = req.body;

    // ✅ 1. Récupérer et valider le panier
    let cart = await Cart.findOne({ user: userId }).populate('coupon');
    
    if ((!cart || !cart.items || cart.items.length === 0) && req.body.items?.length > 0) {
      console.log('⚠️ [OrderController] Panier DB vide. Utilisation du payload frontend.');
      cart = { items: req.body.items, coupon: req.body.coupon || null };
    }

    if (!cart?.items?.length) return next(new AppError('Panier vide', 400));

    // ✅ 2. Vérifier les stocks
    const outOfStock = await checkAvailability(cart.items);
    if (outOfStock.length > 0) {
      return next(new AppError(
        `Stock insuffisant : ${outOfStock.map(i => i.name || i.product?.name || 'Produit').join(', ')}`,
        409
      ));
    }

    // ✅ 3. Calculer les totaux
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    const shippingCost = shipping?.method === 'express' ? 5000 : 0;
    
    let discount = 0;
    if (cart.coupon?.isActive && typeof cart.coupon.isValid === 'function' && cart.coupon.isValid()) {
      discount = cart.coupon.type === 'percentage'
        ? (subtotal * cart.coupon.value) / 100
        : cart.coupon.value;
      if (cart.coupon.maxDiscount) discount = Math.min(discount, cart.coupon.maxDiscount);
      if (cart.coupon.minPurchase && subtotal < cart.coupon.minPurchase) discount = 0;
    }

    const total = Math.max(0, subtotal + shippingCost - discount);

        // ✅ 4. Initialisation CinetPay
    // Mobile Money / Carte = 100% en ligne
    // Cash on Delivery = 50% d'acompte en ligne
    let paymentData = null;
    const isOnlinePayment = payment?.method === 'mobile_money' || payment?.method === 'card';
    const isCashOnDelivery = payment?.method === 'cash_on_delivery';
    const needsPayment = total > 0 && (isOnlinePayment || isCashOnDelivery);
    
    if (needsPayment) {
      try {
        console.log('\n' + '='.repeat(80));
        console.log('💳 [OrderController] CINETPAY INITIALIZATION');
        console.log('='.repeat(80));
        
        // ✅ Calcul du montant à payer
        let paymentAmount = total;
        let paymentDescription = `Commande Bokoma #${userId.slice(-6)}`;
        
        if (isCashOnDelivery) {
          paymentAmount = Math.ceil(total * 0.5); // 50% d'acompte
          paymentDescription = `Acompte 50% - Commande Bokoma #${userId.slice(-6)} (reste ${total - paymentAmount} FCFA à la livraison)`;
          console.log(`💰 Cash on Delivery: Acompte de 50% = ${paymentAmount} FCFA`);
          console.log(`💰 Reste à payer à la livraison: ${total - paymentAmount} FCFA`);
        } else {
          console.log(`💰 Paiement intégral: ${paymentAmount} FCFA`);
        }
        
        // ✅ Mapper l'opérateur
        let cinetpayMethod = 'OM_CI'; // Défaut : Orange Money
        if (payment?.details?.operator) {
          const operatorMap = { 
            'OM': 'OM_CI', 
            'MTN': 'MTN_CI', 
            'WAVE': 'WAVE_CI', 
            'MOOV': 'MOOV_CI' 
          };
          cinetpayMethod = operatorMap[payment.details.operator] || 'OM_CI';
        } else if (payment?.method === 'card') {
          cinetpayMethod = 'CARD';
        }
        
        // ✅ Construire le numéro de téléphone (format Côte d'Ivoire : +225 + 10 chiffres)
        let customerPhone = '+2250707070700'; // Défaut valide
        const rawPhone = payment?.details?.phoneNumber || req.user.phone;
        
        if (rawPhone) {
          // Nettoyer : enlever espaces, tirets, parenthèses
          let phone = String(rawPhone).replace(/[\s\-\(\)]/g, '');
          
          // Normaliser en numéro national (10 chiffres)
          let nationalNumber = phone;
          
          if (phone.startsWith('+225')) {
            nationalNumber = phone.slice(4); // Enlever +225
          } else if (phone.startsWith('00225')) {
            nationalNumber = phone.slice(5); // Enlever 00225
          } else if (phone.startsWith('225')) {
            nationalNumber = phone.slice(3); // Enlever 225
          } else if (phone.startsWith('0')) {
            nationalNumber = phone; // Garder le 0 initial
          }
          
          // Vérifier la longueur (doit être 10 chiffres)
          if (nationalNumber.length === 10 && /^\d+$/.test(nationalNumber)) {
            customerPhone = '+225' + nationalNumber;
          } else {
            console.warn('⚠️ Numéro invalide:', rawPhone, '→ national:', nationalNumber);
            // Garder le numéro tel quel si on ne peut pas le formater
            customerPhone = phone.startsWith('+') ? phone : '+225' + phone.replace(/^0+/, '');
          }
        }
        
        console.log('📞 Customer phone:', {
          raw: rawPhone,
          formatted: customerPhone,
          length: customerPhone.length,
        });
        
        console.log('💳 Payment method:', cinetpayMethod);
        console.log('💰 Amount:', paymentAmount, 'XOF');
        
        paymentData = await initializePayment({
          transactionId: `CMD-${Date.now()}-${userId.slice(-4)}`,
          amount: paymentAmount,
          description: paymentDescription,
          customer: {
            name: req.user.firstName || 'Client',
            surname: req.user.lastName || 'Bokoma',
            email: req.user.email || 'client@bokoma.ci',
            phone: customerPhone,
          },
          return_url: `${process.env.CLIENT_URL}/payment/success`,
          notify_url: `${process.env.API_URL}/api/v1/orders/webhook/cinetpay`,
          payment_method: cinetpayMethod,
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ [OrderController] CINETPAY INIT SUCCESS');
        console.log('='.repeat(80));
        console.log('💳 Payment URL:', paymentData.paymentUrl);
        console.log('🔑 Payment Token:', paymentData.paymentToken?.slice(0, 30) + '...');
        console.log('🆔 Transaction ID:', paymentData.transactionId);
        console.log('='.repeat(80) + '\n');
        
      } catch (err) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ [OrderController] CINETPAY INIT FAILED');
        console.error('='.repeat(80));
        console.error('Error:', err.message);
        console.error('Stack:', err.stack);
        console.error('='.repeat(80) + '\n');
        return next(new AppError('Erreur de paiement, veuillez réessayer', 500));
      }
    } else {
      console.log('ℹ️ [OrderController] No online payment needed');
    }

    // ✅ 5. Construire les items (snapshot)
    const items = cart.items
      .map(item => ({
        product: item.product?._id || item.product,
        variant: item.variant?._id || item.variant,
        name: item.name || item.product?.name || 'Produit',
        sku: item.sku || 'N/A',
        image: item.image || item.product?.images?.[0]?.url,
        size: item.size,
        color: item.color,
        price: item.price || 0,
        quantity: item.quantity || 1,
        subtotal: (item.price || 0) * (item.quantity || 1),
      }))
      .filter(item => item.product);

    if (items.length === 0) {
      return next(new AppError('Aucun produit valide dans le panier', 400));
    }

    // ✅ 6. Créer la commande
    const order = await Order.create({
      user: userId,
      items,
      shipping: {
        ...shipping,
        cost: shippingCost,
        fullName: shipping?.fullName?.trim(),
        phone: shipping?.phone?.trim(),
        street: shipping?.street?.trim(),
        city: shipping?.city?.trim(),
        country: shipping?.country?.trim(),
        postalCode: shipping?.postalCode?.trim(),
      },
      payment: {
        method: payment?.method || 'cash_on_delivery',
        status: 'pending',
        transactionId: paymentData?.transactionId || payment?.transactionId,
        provider: paymentData ? 'cinetpay' : payment?.provider,
        details: payment?.details || {},
        paymentToken: paymentData?.paymentToken,
      },
      subtotal,
      shippingCost,
      discount,
      total,
      currency: 'XOF',
      coupon: cart.coupon?._id,
      notes: notes?.trim(),
      status: 'pending',
      statusHistory: [{ status: 'pending', note: 'Commande créée', timestamp: new Date() }],
    });

    // ✅ 7. Décrémenter les stocks
    await decrementStock(items);

    // ✅ 8. Mettre à jour le coupon
    if (cart.coupon) {
      cart.coupon.usedCount = (cart.coupon.usedCount || 0) + 1;
      if (!cart.coupon.usedBy?.includes(userId)) {
        cart.coupon.usedBy.push(userId);
      }
      await cart.coupon.save();
    }

    // ✅ 9. Vider le panier
    if (cart && typeof cart.save === 'function') {
      cart.items = [];
      cart.coupon = undefined;
      cart.subtotal = 0;
      cart.total = 0;
      await cart.save();
      console.log('🗑️ [OrderController] Panier vidé en base de données');
    } else {
      console.log('ℹ️ [OrderController] Panier provenant du payload frontend');
    }

    // ✅ 10. Email de confirmation (non bloquant)
    sendOrderConfirmation(req.user, order).catch(err => 
      console.error('❌ Confirmation email failed:', err)
    );

    // ✅ Réponse
    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: {
        order: {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          currency: order.currency,
          items: order.items.map(item => ({
            _id: item._id?.toString(),
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            product: item.product ? {
              _id: item.product._id?.toString(),
              name: item.product.name,
              slug: item.product.slug,
              image: item.product.images?.[0]?.url,
            } : null,
          })),
          shipping: order.shipping,
          payment: order.payment,
          createdAt: order.createdAt,
        },
        ...(paymentData && { 
          payment: { 
            paymentToken: paymentData.paymentToken,
            paymentUrl: paymentData.paymentUrl, 
          } 
        }),
      },
    });

  } catch (err) {
    console.error('❌ [OrderController] createOrder error:', err);
    
    if (err.name === 'ValidationError') {
      return next(new AppError('Données de commande invalides', 422));
    }
    if (err.message?.includes('stock') || err.message?.includes('Product not found')) {
      return next(new AppError(err.message, 400));
    }
    
    next(err);
  }
};

// ============================================================================
// GET /api/v1/orders/my — Mes commandes
// ============================================================================
exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return next(new AppError('Utilisateur non authentifié', 401));

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    
    const sortField = req.query.sort?.replace('-', '') || 'createdAt';
    const validSortFields = ['createdAt', 'updatedAt', 'total', 'status', 'orderNumber'];
    const sortBy = validSortFields.includes(sortField) 
      ? (req.query.sort?.startsWith('-') ? '-' : '') + sortField 
      : '-createdAt';

    const filters = { user: userId };
    if (req.query.status && ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(req.query.status)) {
      filters.status = req.query.status;
    }
    if (req.query.startDate || req.query.endDate) {
      filters.createdAt = {};
      if (req.query.startDate) filters.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filters.createdAt.$lte = new Date(req.query.endDate);
    }

    // ✅ CORRECTION : Supprimé .populate('items.variant') qui cause l'erreur
    const [orders, total] = await Promise.all([
      Order.find(filters)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'items.product',
          select: 'name slug images basePrice soldCount',
        }),
      Order.countDocuments(filters),
    ]);

    const formattedOrders = orders.map(order => ({
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      currency: order.currency || 'XOF',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deliveredAt: order.shipping?.deliveredAt,
      items: order.items?.map(item => ({
        _id: item._id?.toString(),
        product: item.product ? {
          _id: item.product._id?.toString(),
          name: item.product.name,
          slug: item.product.slug,
          basePrice: item.product.basePrice,
          image: item.product.images?.[0]?.url || null,
        } : null,
        variant: item.variant || null,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        subtotal: item.subtotal,
      })) || [],
      shipping: {
        fullName: order.shipping?.fullName,
        city: order.shipping?.city,
        country: order.shipping?.country,
        trackingNumber: order.shipping?.trackingNumber,
      },
      paymentMethod: order.payment?.method,
      paymentStatus: order.payment?.status,
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          page, limit, total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });

  } catch (err) {
    console.error('❌ [OrderController] getMyOrders error:', err);
    next(err);
  }
};

// ============================================================================
// GET /api/v1/orders/:id — Détails d'une commande
// ============================================================================
exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const userRole = req.user?.role;

    if (!userId) return next(new AppError('Utilisateur non authentifié', 401));

    // ✅ CORRECTION : Supprimé .populate('items.variant') qui cause l'erreur
    const order = await Order.findById(id)
      .populate({ path: 'items.product', select: 'name slug images basePrice soldCount' });

    if (!order) return next(new AppError('Commande introuvable', 404));

    const orderUserId = order.user?.toString?.() || order.user;
    if (orderUserId !== userId && !['admin', 'manager'].includes(userRole)) {
      return next(new AppError('Accès refusé', 403));
    }

    res.json({
      success: true,
      data: {
        order: {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          statusHistory: order.statusHistory,
          total: order.total,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          discount: order.discount,
          currency: order.currency,
          items: order.items?.map(item => ({
            _id: item._id?.toString(),
            product: item.product ? {
              _id: item.product._id?.toString(),
              name: item.product.name,
              slug: item.product.slug,
              basePrice: item.product.basePrice,
              images: item.product.images,
            } : null,
            variant: item.variant || null,
            name: item.name,
            sku: item.sku,
            image: item.image,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
          shipping: order.shipping,
          payment: order.payment,
          coupon: order.coupon ? {
            _id: order.coupon._id?.toString(),
            code: order.coupon.code,
            discount: order.coupon.type === 'percentage' ? `${order.coupon.value}%` : `${order.coupon.value} FCFA`,
          } : null,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      },
    });

  } catch (err) {
    console.error('❌ [OrderController] getOrder error:', err);
    if (err.name === 'CastError') return next(new AppError('ID de commande invalide', 400));
    next(err);
  }
};

// ============================================================================
// PATCH /api/v1/orders/:id/status — Mettre à jour le statut [admin/manager]
// ============================================================================
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note, trackingNumber } = req.body;
    const userRole = req.user?.role;

    if (!['admin', 'manager'].includes(userRole)) {
      return next(new AppError('Accès refusé : permissions insuffisantes', 403));
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}`, 400));
    }

    const order = await Order.findById(id);
    if (!order) return next(new AppError('Commande introuvable', 404));

    if (status === 'cancelled' && order.status !== 'cancelled') {
      await restoreStock(order.items);
    }

    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({ 
      status, 
      note: note?.trim() || `Statut mis à jour par ${req.user?.email}`, 
      timestamp: new Date(),
      updatedBy: getUserId(req),
    });

    if (trackingNumber) {
      order.shipping = order.shipping || {};
      order.shipping.trackingNumber = trackingNumber.trim();
    }
    if (status === 'delivered') {
      order.shipping = order.shipping || {};
      order.shipping.deliveredAt = new Date();
    }

    await order.save();

    if (status !== previousStatus) {
      const user = await User.findById(order.user).select('email firstName lastName');
      if (user) {
        sendOrderStatusUpdate(user, order).catch(err => 
          console.error('❌ Status update email failed:', err)
        );
      }
    }

    res.json({
      success: true,
      message: `Statut mis à jour : ${previousStatus} → ${status}`,
      data: {
        order: {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          statusHistory: order.statusHistory.slice(-5),
          updatedAt: order.updatedAt,
        },
      },
    });

  } catch (err) {
    console.error('❌ [OrderController] updateOrderStatus error:', err);
    next(err);
  }
};

// ============================================================================
// GET /api/v1/orders — Toutes les commandes [admin]
// ============================================================================
exports.getAllOrders = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return next(new AppError('Accès réservé aux administrateurs', 403));
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    
    const sortField = req.query.sort?.replace('-', '') || 'createdAt';
    const validSortFields = ['createdAt', 'updatedAt', 'total', 'status', 'orderNumber'];
    const sortBy = validSortFields.includes(sortField) 
      ? (req.query.sort?.startsWith('-') ? '-' : '') + sortField 
      : '-createdAt';

    const filters = {};
    if (req.query.status && ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(req.query.status)) {
      filters.status = req.query.status;
    }
    if (req.query.user) filters.user = req.query.user;
    if (req.query.startDate || req.query.endDate) {
      filters.createdAt = {};
      if (req.query.startDate) filters.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filters.createdAt.$lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      filters.$or = [
        { orderNumber: { $regex: req.query.search, $options: 'i' } },
        { 'shipping.fullName': { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filters)
        .populate('user', 'firstName lastName email phone')
        .populate({ path: 'items.product', select: 'name slug images basePrice' })
        .sort(sortBy)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filters),
    ]);

    const formattedOrders = orders.map(order => ({
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      currency: order.currency,
      user: order.user ? {
        _id: order.user._id?.toString(),
        name: `${order.user.firstName} ${order.user.lastName}`,
        email: order.user.email,
      } : null,
      itemsCount: order.items?.length || 0,
      paymentMethod: order.payment?.method,
      paymentStatus: order.payment?.status,
      createdAt: order.createdAt,
      shipping: { city: order.shipping?.city, country: order.shipping?.country },
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          page, limit, total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
        filters: {
          status: req.query.status,
          dateRange: req.query.startDate || req.query.endDate ? { start: req.query.startDate, end: req.query.endDate } : null,
        },
      },
    });

  } catch (err) {
    console.error('❌ [OrderController] getAllOrders error:', err);
    next(err);
  }
};

// ============================================================================
// GET /api/v1/orders/stats — Statistiques enrichies pour dashboard
// ============================================================================
exports.getOrderStats = async (req, res, next) => {
  try {
    if (!['admin', 'manager'].includes(req.user?.role)) {
      return next(new AppError('Accès réservé aux administrateurs', 403));
    }

    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [stats, byStatus, byPayment, revenueTrend] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $nin: ['cancelled'] } } },
        { $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            avgOrder: { $avg: '$total' },
        }},
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } }},
        { $sort: { count: -1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$payment.method', count: { $sum: 1 } }},
      ]),
      Order.aggregate([
        { $match: { 
            createdAt: { $gte: startDate },
            status: { $nin: ['cancelled'] }
          } 
        },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } }
      ]),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          ...(stats[0] || { totalOrders: 0, totalRevenue: 0, avgOrder: 0 }),
          byStatus: byStatus.map(s => ({ status: s._id, count: s.count })),
          byPayment: byPayment.map(p => ({ method: p._id || 'unknown', count: p.count })),
          revenueTrend,
        },
        period: {
          days,
          start: startDate.toISOString(),
          end: new Date().toISOString(),
        },
      },
    });

  } catch (err) {
    console.error('❌ [OrderController] getOrderStats error:', err);
    next(err);
  }
};

// ============================================================================
// DELETE /api/v1/orders/:id — Supprimer [admin]
// ============================================================================
exports.deleteOrder = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return next(new AppError('Accès réservé aux administrateurs', 403));
    }

    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);
    
    if (!order) return next(new AppError('Commande introuvable', 404));

    if (order.items?.length > 0 && order.status !== 'cancelled') {
      await restoreStock(order.items);
    }

    console.log('🗑️ [OrderController] Order deleted:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      deletedBy: getUserId(req),
    });

    res.json({
      success: true,
      message: 'Commande supprimée avec succès',
      data: { orderNumber: order.orderNumber, deletedAt: new Date() },
    });

  } catch (err) {
    console.error('❌ [OrderController] deleteOrder error:', err);
    next(err);
  }
};

// ============================================================================
// GET /api/v1/orders/verify/:orderId — Vérification publique (sans auth)
// ============================================================================
exports.verifyOrderPublic = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .select('orderNumber status createdAt total currency items shipping payment')
      .populate('items.product', 'name')
      .lean();
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' });
    }
    
    const publicOrder = {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      total: order.total,
      currency: order.currency,
      itemCount: order.items?.length || 0,
      shipping: { city: order.shipping?.city, country: order.shipping?.country },
      payment: { method: order.payment?.method },
      items: (order.items || []).map(item => ({
        name: item.name || item.product?.name || 'Produit',
        quantity: item.quantity,
        price: item.price,
      })),
    };
    
    res.json({ success: true, message: 'Commande vérifiée', data: { order: publicOrder } });
    
  } catch (err) {
    console.error('❌ [OrderController] verifyOrderPublic error:', err);
    next(err);
  }
};

// ============================================================================
// POST /api/v1/orders/webhook/cinetpay — Webhook de confirmation CinetPay
// ============================================================================
exports.cinetpayWebhook = async (req, res, next) => {
  try {
    const { merchant_transaction_id, status, amount } = req.body;

    console.log('🔔 [CinetPay Webhook] Received:', { merchant_transaction_id, status });

    if (!merchant_transaction_id) {
      console.warn('⚠️ [CinetPay Webhook] Missing merchant_transaction_id');
      return res.status(400).json({ message: 'Transaction ID manquant' });
    }

    const order = await Order.findOne({ 'payment.transactionId': merchant_transaction_id });
    
    if (!order) {
      console.warn('⚠️ [CinetPay Webhook] Order not found for:', merchant_transaction_id);
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    const verification = await verifyPayment(merchant_transaction_id);
    
    console.log('🔍 [CinetPay Webhook] Verification result:', verification);

    if (verification.success && verification.status === 'SUCCESS') {
      if (order.payment.status !== 'paid') {
        order.payment.status = 'paid';
        order.status = 'processing'; 
        order.statusHistory.push({ 
          status: 'processing', 
          note: 'Paiement confirmé par CinetPay', 
          timestamp: new Date(),
          updatedBy: 'system',
        });
        await order.save();

        const user = await User.findById(order.user).select('email firstName lastName');
        if (user) {
          sendOrderConfirmation(user, order).catch(err => 
            console.error('❌ Confirmation email failed:', err)
          );
        }
      }
    } else if (verification.status === 'FAILED' || verification.status === 'REFUSED') {
      if (order.payment.status !== 'failed') {
        order.payment.status = 'failed';
        order.status = 'cancelled';
        order.statusHistory.push({ 
          status: 'cancelled', 
          note: `Paiement échoué ou refusé (${verification.status})`, 
          timestamp: new Date(),
          updatedBy: 'system',
        });
        await order.save();
        
        await restoreStock(order.items);
      }
    }

    res.status(200).json({ message: 'Webhook reçu avec succès' });
  } catch (error) {
    console.error('❌ Erreur Webhook CinetPay:', error);
    res.status(500).json({ message: 'Erreur interne webhook' });
  }
};