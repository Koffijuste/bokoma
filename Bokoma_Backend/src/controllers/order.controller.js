// src/controllers/order.controller.js
// ============================================================================
// 📦 ORDER CONTROLLER — Couche HTTP fine, délègue la logique au service
// ============================================================================
// REFACTO : toute la logique métier a été extraite vers :
//   - src/services/order.service.js        (orchestration)
//   - src/services/payment-flow.service.js (CinetPay)
//   - src/formatters/order.formatter.js    (DTOs)
// Le contrôleur ne fait plus que : validation auth + délégation + formatage.
// ============================================================================

const Order = require('../models/Order');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const orderService = require('../services/order.service');
const paymentService = require('../services/payment.service');
const {
  formatOrderForClient,
  formatOrderList,
  formatOrderForPublic,
} = require('../formatters/order.formatter');

const getUserId = (req) => req.user?.userId || req.user?._id?.toString();

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE — POST /api/v1/orders
// ─────────────────────────────────────────────────────────────────────────────

exports.createOrder = async (req, res, next) => {
  try {
    const { order, paymentData } = await orderService.createOrder(req);

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: {
        order: formatOrderForClient(order),
        ...(paymentData && {
          payment: {
            paymentToken: paymentData.paymentToken,
            paymentUrl: paymentData.paymentUrl,
            amount: paymentData.paymentAmount,
            isPartialPayment: paymentData.isPartialPayment,
            remainingAmount: paymentData.remainingAmount,
          },
        }),
      },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return next(new AppError('Données de commande invalides', 422));
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET MY ORDERS — GET /api/v1/orders/my
// ─────────────────────────────────────────────────────────────────────────────

exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return next(new AppError('Utilisateur non authentifié', 401));

    const { page, limit, sortBy, filters } = parseListQuery(req, {
      validSortFields: ['createdAt', 'updatedAt', 'total', 'status', 'orderNumber'],
    });

    const [orders, total] = await Promise.all([
      Order.find(filters)
        .sort(sortBy)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: 'items.product',
          select: 'name slug images basePrice soldCount category type variants',
        })
        .populate({ path: 'items.variant' }),
      Order.countDocuments(filters),
    ]);

    // 🐛 FIX : répare les snapshots cassés des anciennes commandes
    // (name='Produit', sku='N/A', size/color/image manquants).
    // Charge les produits non populés en une seule query.
    await orderService.enrichOrders(orders);

    res.json({
      success: true,
      data: formatOrderList(orders, total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ORDER — GET /api/v1/orders/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getOrder = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const userRole = req.user?.role;
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone avatar')
      .populate({
        path: 'items.product',
        select: 'name slug images basePrice soldCount description category type variants',
      })
      .populate({ path: 'items.variant' });

    if (!order) return next(new AppError('Commande introuvable', 404));

    const orderUserId = order.user?._id?.toString?.() || order.user?.toString?.();
    if (orderUserId !== userId && !['admin', 'manager'].includes(userRole)) {
      return next(new AppError('Accès refusé', 403));
    }

    // 🐛 FIX : répare les snapshots cassés (lecture seule — ne persiste rien)
    await orderService.enrichOrderItems(order);

    res.json({
      success: true,
      data: { order: formatOrderForClient(order) },
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return next(new AppError('ID de commande invalide', 400));
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE STATUS — PATCH /api/v1/orders/:id/status (admin/manager)
// ─────────────────────────────────────────────────────────────────────────────

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { order, previousStatus } = await orderService.updateOrderStatus(req);

    res.json({
      success: true,
      message: `Statut mis à jour : ${previousStatus} → ${order.status}`,
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
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL ORDERS — GET /api/v1/orders (admin)
// ─────────────────────────────────────────────────────────────────────────────

exports.getAllOrders = async (req, res, next) => {
  try {
    const { page, limit, sortBy, filters } = parseListQuery(req, {
      validSortFields: ['createdAt', 'updatedAt', 'total', 'status', 'orderNumber'],
      includeSearch: true,
    });

    const [orders, total] = await Promise.all([
      Order.find(filters)
        .populate('user', 'firstName lastName email phone avatar')
        .populate({
          path: 'items.product',
          select: 'name slug images basePrice category type variants',
        })
        .populate({ path: 'items.variant' })
        .sort(sortBy)
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filters),
    ]);

    // 🐛 FIX : répare les snapshots cassés (lecture seule)
    await orderService.enrichOrders(orders);

    res.json({
      success: true,
      data: {
        ...formatOrderList(orders, total, page, limit),
        filters: {
          status: req.query.status,
          dateRange: req.query.startDate || req.query.endDate
            ? { start: req.query.startDate, end: req.query.endDate }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ORDER STATS — GET /api/v1/orders/stats (admin)
// ─────────────────────────────────────────────────────────────────────────────

exports.getOrderStats = async (req, res, next) => {
  try {
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
        } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$payment.method', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $nin: ['cancelled'] } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          ...(stats[0] || { totalOrders: 0, totalRevenue: 0, avgOrder: 0 }),
          byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
          byPayment: byPayment.map((p) => ({ method: p._id || 'unknown', count: p.count })),
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
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE — DELETE /api/v1/orders/:id (admin)
// ─────────────────────────────────────────────────────────────────────────────

exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await orderService.deleteOrder(req);

    res.json({
      success: true,
      message: 'Commande supprimée avec succès',
      data: { orderNumber: order.orderNumber, deletedAt: new Date() },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC VERIFY — GET /api/v1/orders/verify/:orderId (sans auth)
// ─────────────────────────────────────────────────────────────────────────────

exports.verifyOrderPublic = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .select('orderNumber status createdAt total subtotal shippingCost discount currency items shipping payment notes')
      .populate({ path: 'items.product', select: 'name slug images basePrice variants' })
      .populate({ path: 'items.variant' })
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' });
    }

    // 🐛 FIX : répare les snapshots cassés (lecture seule)
    await orderService.enrichOrderItems(order);

    res.json({
      success: true,
      message: 'Commande vérifiée',
      data: { order: formatOrderForPublic(order) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CINETPAY WEBHOOK — POST /api/v1/orders/webhook/cinetpay
// ⚠️ Conservé pour rétro-compatibilité — la route principale est dans
// src/routes/webhook.routes.js avec vérification de signature.
// ─────────────────────────────────────────────────────────────────────────────

exports.cinetpayWebhook = async (req, res) => {
  try {
    const { merchant_transaction_id, status, amount } = req.body;

    if (!merchant_transaction_id) {
      return res.status(400).json({ message: 'Transaction ID manquant' });
    }

    const order = await Order.findOne({ 'payment.transactionId': merchant_transaction_id });
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    let verification;
    try {
      verification = await paymentService.verifyPayment(merchant_transaction_id);
    } catch (err) {
      verification = { success: false, status: 'UNKNOWN' };
    }

    if (verification.success || verification.status === 'SUCCESS') {
      if (order.payment.status !== 'paid') {
        order.markAsPaid(merchant_transaction_id, 'cinetpay');
        order.payment.amountPaid = Number(amount) || order.total;
        await order.save();
      }
    } else if (['FAILED', 'REFUSED'].includes(verification.status)) {
      if (order.payment.status !== 'failed') {
        order.markAsFailed(`Paiement ${verification.status}`);
        await order.save();
        await require('../services/inventory.service').restoreStock(order.items);
      }
    }

    res.status(200).json({ message: 'Webhook reçu avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur interne webhook' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CANCEL — PATCH /api/v1/orders/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(req);

    res.json({
      success: true,
      message: 'Commande annulée avec succès',
      data: {
        order: {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MARK AS DELIVERED — PATCH /api/v1/orders/:id/delivered
// ─────────────────────────────────────────────────────────────────────────────

exports.markAsDelivered = async (req, res, next) => {
  try {
    const order = await orderService.markAsDelivered(req);

    res.json({
      success: true,
      message: `Commande #${order.orderNumber} marquée comme livrée`,
      data: {
        order: {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          deliveredAt: order.shipping.deliveredAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ARCHIVE — PATCH /api/v1/orders/:id/archive
// ─────────────────────────────────────────────────────────────────────────────

exports.archiveOrder = async (req, res, next) => {
  try {
    const order = await orderService.archiveOrder(req);

    res.json({
      success: true,
      message: `Commande #${order.orderNumber} archivée avec succès`,
      data: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        archivedAt: order.archivedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS INTERNES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse les query params de listing avec pagination + filtres.
 */
function parseListQuery(req, { validSortFields = [], includeSearch = false } = {}) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const sortField = req.query.sort?.replace('-', '') || 'createdAt';
  const sortBy = validSortFields.includes(sortField)
    ? (req.query.sort?.startsWith('-') ? '-' : '') + sortField
    : '-createdAt';

  const filters = {};

  // Filtre user (pour les routes "my")
  if (req.baseUrl === '/api/v1/orders' && req.route?.path === '/my') {
    filters.user = req.user?.userId || req.user?._id?.toString();
    filters.archivedByUser = { $ne: true };
  }

  if (req.query.status && orderService.VALID_ORDER_STATUSES.includes(req.query.status)) {
    filters.status = req.query.status;
  }
  if (req.query.user) filters.user = req.query.user;
  if (req.query.startDate || req.query.endDate) {
    filters.createdAt = {};
    if (req.query.startDate) filters.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filters.createdAt.$lte = new Date(req.query.endDate);
  }

  if (includeSearch && req.query.search) {
    filters.$or = [
      { orderNumber: { $regex: req.query.search, $options: 'i' } },
      { 'shipping.fullName': { $regex: req.query.search, $options: 'i' } },
    ];
  }

  return { page, limit, sortBy, filters };
}