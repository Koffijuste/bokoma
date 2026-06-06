// bokoma_backend/src/controllers/cart.controller.js
// ============================================================================
// 🛒 CART CONTROLLER - Gestion du panier utilisateur/guest
// ============================================================================

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');
const { isValidObjectId } = require('mongoose');

// ============================================================================
// 🔹 HELPER: Get or create cart for user/session
// ============================================================================
const getOrCreateCart = async (req) => {
  const filter = req.user 
    ? { user: req.user._id } 
    : { sessionId: req.headers['x-session-id'] };
  
  let cart = await Cart.findOne(filter);
  if (!cart) {
    cart = new Cart({ ...filter, items: [], subtotal: 0, total: 0 });
  }
  return cart;
};

// ============================================================================
// GET /api/v1/cart
// ============================================================================
exports.getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req);
    
    // ✅ Peupler les produits pour infos complètes
    await cart.populate({
      path: 'items.product',
      select: 'name slug images basePrice brand type soldCount',
      populate: { path: 'images', select: 'url publicId isPrimary' }
    });
    
    // ✅ Calculer les totaux côté backend (cohérence)
    const subtotal = cart.items.reduce((sum, item) => 
      sum + (item.price || 0) * (item.quantity || 1), 0
    );
    const itemCount = cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    res.json({
      success: true,
      data: {
        cart: {
          ...cart.toObject(),
          subtotal,
          itemCount,
          total: subtotal - (cart.discount || 0) + (cart.shippingCost || 0),
        },
      },
    });
    
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// POST /api/v1/cart/items — Ajouter un produit
// ============================================================================
exports.addItem = async (req, res, next) => {
  try {
    const { product: productId, variantId, quantity = 1, size, color } = req.body;

    // ✅ Validation productId
    if (!productId || !isValidObjectId(productId)) {
      return next(new AppError('ID de produit invalide', 400));
    }

    // ✅ Trouver et valider le produit
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new AppError('Produit indisponible', 404));
    }

    // ✅ Gestion des variantes
    let price = product.basePrice;
    let variantData = {};
    
    if (variantId) {
      if (!isValidObjectId(variantId)) {
        return next(new AppError('ID de variante invalide', 400));
      }
      
      const variant = product.variants?.id(variantId);
      if (!variant || !variant.isActive) {
        return next(new AppError('Variante indisponible', 404));
      }
      if (variant.stock < quantity) {
        return next(new AppError(`Stock insuffisant : ${variant.stock} disponible`, 409));
      }
      
      price = variant.price || product.basePrice;
      variantData = {
        variant: variantId,
        sku: variant.sku,
        size: variant.size || size,
        color: variant.color || color,
      };
    }

    // ✅ Get or create cart
    const cart = await getOrCreateCart(req);

    // ✅ Chercher item existant (même produit + même variante)
    const existingItem = cart.items.find(item => 
      item.product.toString() === productId && 
      (!variantId || item.variant?.toString() === variantId) &&
      item.size === variantData.size &&
      item.color === variantData.color
    );

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + quantity;
    } else {
      cart.items.push({
        product: productId,
        name: product.name,
        image: product.images?.[0]?.url,
        price,
        quantity,
        ...variantData,
      });
    }

    // ✅ Recalculer les totaux
    cart.subtotal = cart.items.reduce((sum, item) => 
      sum + (item.price || 0) * (item.quantity || 1), 0
    );
    cart.total = cart.subtotal - (cart.discount || 0) + (cart.shippingCost || 0);
    
    await cart.save();
    
    // ✅ Peupler pour la réponse
    await cart.populate({
      path: 'items.product',
      select: 'name slug images basePrice',
      populate: { path: 'images', select: 'url' }
    });

    res.status(201).json({
      success: true,
      message: 'Produit ajouté au panier',
      data: { cart },
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================================
// PATCH /api/v1/cart/items/:itemId — Mettre à jour quantité
// ============================================================================
exports.updateItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    // ✅ Validation itemId
    if (!isValidObjectId(itemId)) {
      return next(new AppError('ID d\'article invalide', 400));
    }
    
    if (!quantity || quantity < 1) {
      return next(new AppError('Quantité invalide (minimum 1)', 400));
    }

    const cart = await getOrCreateCart(req);
    
    // ✅ Trouver l'item dans le panier
    const item = cart.items.id(itemId);
    if (!item) {
      return next(new AppError('Article introuvable dans le panier', 404));
    }

    // ✅ Vérifier stock si quantité augmentée
    if (quantity > item.quantity && item.product) {
      const product = await Product.findById(item.product);
      if (product) {
        const variant = item.variant ? product.variants?.id(item.variant) : null;
        const availableStock = variant?.stock || product.totalStock || 0;
        
        if (availableStock < quantity) {
          return next(new AppError(`Stock insuffisant : ${availableStock} disponible`, 409));
        }
      }
    }

    item.quantity = quantity;
    
    // ✅ Recalculer totaux
    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
    cart.total = cart.subtotal - (cart.discount || 0) + (cart.shippingCost || 0);
    
    await cart.save();
    
    await cart.populate({
      path: 'items.product',
      select: 'name slug images basePrice',
      populate: { path: 'images', select: 'url' }
    });

    res.json({
      success: true,
      message: 'Quantité mise à jour',
      data: { cart },
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE /api/v1/cart/items/:itemId — Supprimer un article
// ============================================================================
exports.removeItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // ✅ Validation itemId
    if (!isValidObjectId(itemId)) {
      return next(new AppError('ID d\'article invalide', 400));
    }
    
    const cart = await getOrCreateCart(req);
    
    // ✅ Filtrer l'item à supprimer
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    
    if (cart.items.length === initialLength) {
      return next(new AppError('Article introuvable dans le panier', 404));
    }

    // ✅ Recalculer totaux
    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
    cart.total = cart.subtotal - (cart.discount || 0) + (cart.shippingCost || 0);
    
    // ✅ Retirer coupon si panier vide
    if (cart.items.length === 0) {
      cart.coupon = undefined;
      cart.discount = 0;
    }
    
    await cart.save();
    
    await cart.populate({
      path: 'items.product',
      select: 'name slug images basePrice',
      populate: { path: 'images', select: 'url' }
    });

    res.json({
      success: true,
      message: 'Article retiré du panier',
      data: { cart },
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE /api/v1/cart — Vider le panier
// ============================================================================
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req);
    
    cart.items = [];
    cart.coupon = undefined;
    cart.subtotal = 0;
    cart.total = 0;
    cart.discount = 0;
    
    await cart.save();

    res.json({
      success: true,
      message: 'Panier vidé avec succès',
      data: { cart },
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================================
// POST /api/v1/cart/coupon — Appliquer un code promo
// ============================================================================
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return next(new AppError('Code promo requis', 400));
    }

    // ✅ Trouver coupon valide
    const coupon = await Coupon.findOne({
      code: code.toUpperCase().trim(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gt: new Date() },
    });

    if (!coupon) {
      return next(new AppError('Code promo invalide ou expiré', 404));
    }

    // ✅ Vérifier limites d'usage
    if (coupon.maxUsage && coupon.currentUsage >= coupon.maxUsage) {
      return next(new AppError('Code promo épuisé', 409));
    }

    const cart = await getOrCreateCart(req);
    const subtotal = cart.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);

    // ✅ Vérifier montant minimum
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      return next(new AppError(`Montant minimum requis : ${coupon.minOrderValue} FCFA`, 400));
    }

    // ✅ Calculer la remise
    let discount = coupon.discountType === 'percentage'
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;
    
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }

    // ✅ Appliquer au panier
    cart.coupon = coupon._id;
    cart.discount = discount;
    cart.total = subtotal - discount + (cart.shippingCost || 0);
    
    // ✅ Incrémenter usage
    coupon.currentUsage = (coupon.currentUsage || 0) + 1;
    await coupon.save();
    await cart.save();

    res.json({
      success: true,
      message: 'Code promo appliqué',
      data: {
        discount,
        coupon: {
          code: coupon.code,
          type: coupon.discountType,
          value: coupon.discountValue,
        },
        cart: {
          subtotal,
          discount,
          total: cart.total,
        },
      },
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE /api/v1/cart/coupon — Retirer code promo
// ============================================================================
exports.removeCoupon = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req);
    
    if (!cart.coupon) {
      return next(new AppError('Aucun code promo appliqué', 400));
    }

    cart.coupon = undefined;
    cart.discount = 0;
    
    const subtotal = cart.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
    cart.total = subtotal + (cart.shippingCost || 0);
    
    await cart.save();

    res.json({
      success: true,
      message: 'Code promo retiré',
      data: {
        cart: {
          subtotal,
          discount: 0,
          total: cart.total,
        },
      },
    });

  } catch (err) {
    next(err);
  }
};