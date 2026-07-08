// src/services/order.service.js
// ============================================================================
// 📦 ORDER SERVICE — Orchestration de la création et du cycle de vie des commandes
// ============================================================================
// Toute la logique métier (checkout, statuts, annulation, etc.) est ici.
// Le contrôleur ne fait plus que de la traduction HTTP ↔ métier.
// ============================================================================

const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const {
  decrementStock,
  restoreStock,
  checkAvailability,
} = require('./inventory.service');
const paymentFlowService = require('./payment-flow.service');
const paymentService = require('./payment.service');
const NotificationService = require('./notification.service');
const {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
} = require('./email.service');

// Tarifs de livraison (en FCFA)
const SHIPPING_RATES = {
  express: 5000,
  standard: 2500,
  pickup: 0,
};
const DEFAULT_SHIPPING_COST = 2500;

// Délai d'expiration d'un paiement en attente (5 min)
const PAYMENT_EXPIRY_MS = 5 * 60 * 1000;

const VALID_ORDER_STATUSES = [
  'pending', 'confirmed', 'processing', 'shipped',
  'delivered', 'cancelled', 'refunded',
];

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getUserId = (req) => req.user?.userId || req.user?._id?.toString();

const computeShippingCost = (shipping) => {
  if (!shipping?.method) return DEFAULT_SHIPPING_COST;
  return SHIPPING_RATES[shipping.method] ?? DEFAULT_SHIPPING_COST;
};

const computeCouponDiscount = (coupon, subtotal) => {
  if (!coupon?.isActive) return 0;
  if (typeof coupon.isValid === 'function' && !coupon.isValid()) return 0;
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) return 0;

  let discount = coupon.type === 'percentage'
    ? (subtotal * coupon.value) / 100
    : coupon.value;

  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return discount;
};

const resolveCart = async (userId, payload) => {
  const cart = await Cart.findOne({ user: userId }).populate('coupon');

  if ((!cart || !cart.items?.length) && payload.items?.length) {
    return { items: payload.items, coupon: payload.coupon || null, isReconstructed: true };
  }

  if (!cart) {
    return { items: [], coupon: null, isReconstructed: false };
  }

  return {
    items: cart.items,
    coupon: cart.coupon || null,
    isReconstructed: false,
    save: async () => cart.save(),
    raw: cart.toObject(),
  };
};

const buildOrderItems = (cartItems) => {
  return (cartItems || [])
    .map((item) => {
      // ⚠️ Le cart item (post-fix cart.controller.js) contient déjà
      // name/sku/size/color/image/price/quantity. On convertit juste
      // les refs d'objet en IDs pour persister en DB.
      const product =
        item.product && typeof item.product === 'object' && item.product.name
          ? item.product
          : null;

      // Filet de sécurité : si le cart item n'a pas été créé via le fix
      // (anciens paniers legacy), on tente une dernière passe d'enrichissement
      // synchrone depuis le produit populé — sans aller chercher en DB (pour
      // ne pas pénaliser le checkout).
      let resolvedSize = item.size;
      let resolvedColor = item.color;
      let resolvedSku = item.sku || product?.variants?.[0]?.sku;

      if (product && Array.isArray(product.variants)) {
        const matchedVariant = product.variants.find(
          (v) =>
            (item.variant && (v._id?.toString?.() === item.variant?.toString?.())) ||
            (item.sku && v.sku === item.sku),
        );
        if (matchedVariant) {
          resolvedSize = resolvedSize || matchedVariant.size;
          resolvedColor = resolvedColor || matchedVariant.color;
          resolvedSku = resolvedSku || matchedVariant.sku;
        }
      }

      return {
        product: item.product?._id || item.product,
        variant: item.variant?._id || item.variant,
        name: item.name || product?.name || 'Produit',
        sku: resolvedSku || 'N/A',
        image: item.image || product?.images?.[0]?.url || product?.images?.[0],
        size: resolvedSize,
        color: resolvedColor,
        price: item.price || 0,
        quantity: item.quantity || 1,
        subtotal: (item.price || 0) * (item.quantity || 1),
      };
    })
    .filter((item) => item.product);
};

// ─────────────────────────────────────────────────────────────────────────────
//  ENRICHMENT — Répare les snapshots de commandes anciennes ou cassées
// ─────────────────────────────────────────────────────────────────────────────
// Pourquoi : la migration initiale du panier avait un bug qui stockait des
// placeholders `name:'Produit'` / `sku:'N/A'` et perdait `size`/`color` quand
// il n'y avait pas de variantId. Ces snapshots sont immuables (c'est tout
// l'intérêt d'un snapshot) mais on a besoin de les afficher correctement dans
// l'admin.
//
// Stratégie :
//   1. `enrichSingleItem(item, product)` — fonction PURE qui mute un item en
//      place à partir d'un produit déjà chargé. Idempotente.
//   2. `enrichOrderItems(order)` — async ; charge les produits manquants en
//      une seule query depuis la DB et applique enrichSingleItem. Utilisé en
//      lecture par les contrôleurs pour réparer à la volée les vieilles
//      commandes.
//   3. `enrichOrders(orders)` — variante pour un tableau de commandes, avec
//      une seule query Product.find() pour tout le lot. Utilisé par la
//      migration et les listings.
// ─────────────────────────────────────────────────────────────────────────────

const getImageUrlFromProduct = (product) => {
  if (!product || !Array.isArray(product.images) || product.images.length === 0) return null;
  const primary = product.images.find((img) => img && (img.isPrimary || img.url));
  const first = product.images[0];
  return (
    primary?.url ||
    first?.url ||
    (typeof first === 'string' ? first : null)
  );
};

const resolveVariantFromProduct = (item, product) => {
  if (!product || !Array.isArray(product.variants)) return null;
  if (item.variant && typeof item.variant === 'object' && (item.variant.size || item.variant.sku)) {
    return item.variant;
  }
  const itemVariantId =
    item.variant && typeof item.variant === 'object'
      ? item.variant._id?.toString?.()
      : item.variant?.toString?.();
  const itemSku = item.sku;
  return (
    product.variants.find((v) => {
      const vId = v._id?.toString?.();
      if (itemVariantId && vId === itemVariantId) return true;
      if (itemSku && v.sku && v.sku === itemSku) return true;
      return false;
    }) || null
  );
};

/**
 * Enrichit un item en place. Ne touche JAMAIS price/quantity/subtotal.
 * Idempotente : appliquer deux fois ne change rien.
 *
 * @param {Object} item    — item de commande (mongoose ou plain object)
 * @param {Object} product — produit populé (avec name/variants/images)
 * @returns {boolean}      — true si au moins un champ a été patché
 */
const enrichSingleItem = (item, product) => {
  if (!item || !product) return false;
  let changed = false;

  // 1. name — patch le placeholder 'Produit'
  if ((!item.name || item.name === 'Produit') && product.name) {
    item.name = product.name;
    changed = true;
  }

  // 2. sku — patch 'N/A'
  if (!item.sku || item.sku === 'N/A') {
    const variant = resolveVariantFromProduct(item, product);
    const newSku = variant?.sku || product.sku || product.variants?.[0]?.sku;
    if (newSku) {
      item.sku = newSku;
      changed = true;
    }
  }

  // 3. size
  if (!item.size) {
    const variant = resolveVariantFromProduct(item, product);
    if (variant?.size) {
      item.size = variant.size;
      changed = true;
    }
  }

  // 4. color
  if (!item.color) {
    const variant = resolveVariantFromProduct(item, product);
    if (variant?.color) {
      item.color = variant.color;
      changed = true;
    }
  }

  // 5. image — filet si l'item n'en a pas
  if (!item.image) {
    const url = getImageUrlFromProduct(product);
    if (url) {
      item.image = url;
      changed = true;
    }
  }

  return changed;
};

/**
 * Enrichit les items d'une commande (in-place). Charge au préalable
 * les produits manquants depuis la DB en une seule query.
 *
 * Accepte une commande mongoose, un plain object, ou directement un
 * tableau d'items.
 *
 * @returns {number} nombre d'items modifiés
 */
const enrichOrderItems = async (orderOrItems) => {
  const items = Array.isArray(orderOrItems)
    ? orderOrItems
    : orderOrItems?.items || [];

  if (!items.length) return 0;

  const productMap = new Map();

  // Produits déjà populés dans les items → on les utilise tels quels
  for (const item of items) {
    if (item.product && typeof item.product === 'object' && item.product.name) {
      const pid = (item.product._id || item.product).toString();
      if (!productMap.has(pid)) productMap.set(pid, item.product);
    }
  }

  // Produits manquants → query unique si on a au moins un item qui en a besoin
  const missingIds = new Set();
  for (const item of items) {
    if (!item.product) continue;
    const pid = (typeof item.product === 'object' ? item.product._id : item.product)?.toString?.();
    if (!pid || productMap.has(pid)) continue;
    // On ne charge que si l'item ressemble à un cas cassé (sinon c'est inutile)
    const looksBroken =
      !item.name ||
      item.name === 'Produit' ||
      !item.sku ||
      item.sku === 'N/A' ||
      !item.size ||
      !item.color ||
      !item.image;
    if (looksBroken) missingIds.add(pid);
  }

  if (missingIds.size > 0) {
    const products = await Product.find({ _id: { $in: Array.from(missingIds) } })
      .select('name slug images variants sku basePrice type')
      .lean();
    for (const p of products) {
      productMap.set(p._id.toString(), p);
    }
  }

  let changedItems = 0;
  for (const item of items) {
    if (!item.product) continue;
    const pid = (typeof item.product === 'object' ? item.product._id : item.product)?.toString?.();
    const product = productMap.get(pid);
    if (!product) continue;
    if (enrichSingleItem(item, product)) changedItems++;
  }

  return changedItems;
};

/**
 * Enrichit un TABLEAU de commandes avec une seule query Product.find()
 * pour l'ensemble du lot. Retourne le nombre total d'items modifiés.
 *
 * @param {Array} orders commandes mongoose docs OU plain objects (lean)
 */
const enrichOrders = async (orders) => {
  if (!Array.isArray(orders) || orders.length === 0) return 0;

  // Collecter tous les productIds référencés
  const productIds = new Set();
  for (const order of orders) {
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items) {
      if (!item.product) continue;
      const pid = (typeof item.product === 'object' ? item.product._id : item.product)?.toString?.();
      if (pid) productIds.add(pid);
    }
  }

  if (productIds.size === 0) return 0;

  // Une seule query pour tout le lot
  const products = await Product.find({ _id: { $in: Array.from(productIds) } })
    .select('name slug images variants sku basePrice type')
    .lean();
  const productMap = new Map();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

  let totalChanged = 0;
  for (const order of orders) {
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items) {
      if (!item.product) continue;
      const pid = (typeof item.product === 'object' ? item.product._id : item.product)?.toString?.();
      const product = productMap.get(pid);
      if (!product) continue;
      if (enrichSingleItem(item, product)) totalChanged++;
    }
  }

  return totalChanged;
};

const generateTransactionId = (userId) =>
  `CMD-${Date.now()}-${userId.slice(-4)}`;

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE ORDER — Checkout complet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée une commande, décrémente le stock, initialise le paiement CinetPay.
 *
 * @throws {AppError} sur stock insuffisant, panier vide, etc.
 * @returns {Promise<{ order: Order, paymentData?: Object }>}
 */
const createOrder = async (req) => {
  const userId = getUserId(req);
  if (!userId) throw new AppError('Utilisateur non authentifié', 401);

  // ✅ Tolérance : accepter shippingMethod / paymentMethod en racine (legacy)
  //                 ou shipping.method / payment.method (canonique)
  const { shipping: shippingRaw, payment: paymentRaw, notes } = req.body;
  const shipping = {
    ...shippingRaw,
    method: shippingRaw?.method || req.body.shippingMethod || 'standard',
  };
  const payment = {
    method: paymentRaw?.method || req.body.paymentMethod || 'cash_on_delivery',
    details: paymentRaw?.details || {},
  };

  // 1. Récupérer le panier
  const cart = await resolveCart(userId, req.body);
  if (!cart?.items?.length) {
    throw new AppError('Panier vide', 400);
  }

  // 2. Vérifier la disponibilité du stock (sans modifier)
  const outOfStock = await checkAvailability(cart.items);
  if (outOfStock.length > 0) {
    const names = outOfStock
      .map((i) => i.name || i.product?.name || 'Produit')
      .join(', ');
    throw new AppError(`Stock insuffisant : ${names}`, 409);
  }

  // 3. Calculer les totaux
  const subtotal = cart.items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0,
  );
  const shippingCost = computeShippingCost(shipping);
  const discount = computeCouponDiscount(cart.coupon, subtotal);
  const total = Math.max(0, subtotal + shippingCost - discount);

  // 4. Construire le snapshot des items
  const items = buildOrderItems(cart.items);
  if (items.length === 0) {
    throw new AppError('Aucun produit valide dans le panier', 400);
  }

  // 5. Créer la commande (statut "pending")
  const transactionId = generateTransactionId(userId);

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
      method: payment.method,
      status: 'pending',
      transactionId,
      provider: null,
      details: payment.details,
      amountPaid: 0,
      remainingAmount: 0,
    },
    subtotal,
    shippingCost,
    discount,
    total,
    currency: 'XOF',
    coupon: cart.coupon?._id,
    notes: notes?.trim(),
    status: 'pending',
    paymentExpiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MS),
    statusHistory: [{ status: 'pending', note: 'Commande créée', timestamp: new Date() }],
  });

  // 6. Décrémenter le stock (réservation immédiate)
  await decrementStock(items);

  // 7. Initialiser le paiement CinetPay (si méthode online ou cash_on_delivery)
  let paymentData = null;
  const paymentMethod = payment?.method || 'cash_on_delivery';
  const isOnlinePayment = ['mobile_money', 'card'].includes(paymentMethod);
  const needsPayment = total > 0 && (isOnlinePayment || paymentMethod === 'cash_on_delivery');

  if (needsPayment) {
    try {
      paymentData = await paymentFlowService.initializeCinetPayPayment({
        transactionId,
        amount: total,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        user: req.user,
        paymentMethod,
        operator: payment?.details?.operator,
      });

      order.payment.provider = 'cinetpay';
      order.payment.paymentToken = paymentData.paymentToken;
      order.payment.amountPaid = paymentData.paymentAmount;
      order.payment.remainingAmount = paymentData.remainingAmount;
      order.payment.correlationId = paymentData.correlationId;
      await order.save();
    } catch (err) {
      // 🪵 Log structuré — la cause originale est INDISPENSABLE pour debug
      // côté Railway (env vars CinetPay manquantes, credentials invalides,
      // payload rejeté, timeout réseau, etc.). Le logger redact les secrets
      // automatiquement. Le correlationId permet de grepper la transaction
      // dans tous les logs Railway associés.
      logger.error('order', 'payment_init_failed', {
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
        transactionId,
        paymentMethod,
        total,
        operator: payment?.details?.operator,
        correlationId: err._correlationId || paymentData?.correlationId,
        appErrorMessage: err.message,
        appErrorStatus: err.statusCode,
        httpStatus: err.response?.status,
        axiosCode: err.code,
        description: err.response?.data?.description || err.response?.data?.message,
        // La cause originelle (Axios / réseau / rejet CinetPay) est déjà loggée
        // par payment.service.js, mais on logge aussi sa stack ici pour avoir
        // le chemin complet d'exécution sans grepper plusieurs fichiers.
        causeMessage: err.cause?.message,
        causeCode: err.cause?.code,
        stack: err.stack?.split('\n').slice(0, 8).join('\n'),
      });

      // Rollback : restaurer le stock et annuler la commande
      await rollbackOrder(order, items, `Erreur initialisation paiement: ${err.message}`);

      // On relance une AppError qui chaîne la cause originale.
      // → Logs Railway : on verra les deux stacks (via errorHandler.js).
      // → Réponse client : reste générique pour ne rien exposer.
      // → Mais on stocke le correlationId dans la cause pour debug avancé.
      const wrapped = new AppError(
        'Erreur de paiement, veuillez réessayer',
        500,
        err,
      );
      wrapped._correlationId = err._correlationId || paymentData?.correlationId;
      wrapped._orderNumber = order.orderNumber;
      throw wrapped;
    }
  }

  // 8. Mettre à jour le coupon (usage unique par user)
  if (cart.coupon && !cart.isReconstructed) {
    cart.coupon.usedCount = (cart.coupon.usedCount || 0) + 1;
    if (!cart.coupon.usedBy?.includes(userId)) {
      cart.coupon.usedBy.push(userId);
    }
    await cart.coupon.save();
  }

  // 9. Vider le panier (uniquement si DB)
  if (!cart.isReconstructed && typeof cart.save === 'function') {
    cart.items.length = 0;
    cart.coupon = undefined;
    if (cart.raw) {
      cart.raw.subtotal = 0;
      cart.raw.total = 0;
    }
    await cart.save();
  }

  // 10. Email de confirmation (non bloquant)
  sendOrderConfirmation(req.user, order).catch(() => undefined);

  return { order, paymentData };
};

/**
 * Annule une commande et restaure le stock. Utilisé en interne pour les rollbacks
 * et exposé pour les annulations utilisateur/admin.
 */
const rollbackOrder = async (order, items, reason) => {
  try {
    await restoreStock(items);
    order.status = 'cancelled';
    order.payment.status = 'failed';
    order.payment.rejectionReason = reason;
    order.statusHistory.push({
      status: 'cancelled',
      note: `Annulée - ${reason}`,
      timestamp: new Date(),
    });
    await order.save();
  } catch {
    // Rollback silencieux — déjà géré par le caller
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CANCEL — Annulation par le client
// ─────────────────────────────────────────────────────────────────────────────

const cancelOrder = async (req) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(id);
  if (!order) throw new AppError('Commande introuvable', 404);

  const orderUserId = order.user?._id?.toString?.() || order.user?.toString?.();
  if (orderUserId !== userId) {
    throw new AppError('Accès refusé', 403);
  }

  if (['shipped', 'delivered'].includes(order.status)) {
    throw new AppError('Impossible d\'annuler une commande déjà expédiée', 400);
  }
  if (order.status === 'cancelled') {
    throw new AppError('Commande déjà annulée', 400);
  }

  await restoreStock(order.items);
  order.cancel(reason || 'Annulée par le client');
  await order.save();

  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE STATUS — Changement de statut par admin
// ─────────────────────────────────────────────────────────────────────────────

const updateOrderStatus = async (req) => {
  const { id } = req.params;
  const { status, note, trackingNumber } = req.body;

  if (!status || !VALID_ORDER_STATUSES.includes(status)) {
    throw new AppError(
      `Statut invalide. Valeurs acceptées : ${VALID_ORDER_STATUSES.join(', ')}`,
      400,
    );
  }

  const order = await Order.findById(id);
  if (!order) throw new AppError('Commande introuvable', 404);

  const previousStatus = order.status;

  // Restaurer le stock si annulation
  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    await restoreStock(order.items);
  }

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

  // Email au client (non bloquant)
  if (status !== previousStatus) {
    const user = await User.findById(order.user).select('email firstName lastName');
    if (user) {
      sendOrderStatusUpdate(user, order).catch(() => undefined);
    }
  }

  return { order, previousStatus };
};

// ─────────────────────────────────────────────────────────────────────────────
//  MARK AS DELIVERED — Confirmation client
// ─────────────────────────────────────────────────────────────────────────────

const markAsDelivered = async (req) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) throw new AppError('Commande introuvable', 404);

  const orderUserId = order.user?._id?.toString?.() || order.user?.toString?.();
  if (orderUserId !== userId) {
    throw new AppError('Accès refusé', 403);
  }

  if (order.status !== 'confirmed') {
    throw new AppError(
      `Seules les commandes confirmées peuvent être marquées livrées (statut actuel: ${order.status})`,
      400,
    );
  }

  order.status = 'delivered';
  order.shipping = order.shipping || {};
  order.shipping.deliveredAt = new Date();
  order.statusHistory.push({
    status: 'delivered',
    note: 'Livraison confirmée par le client',
    timestamp: new Date(),
    changedBy: userId,
  });
  await order.save();

  const user = await User.findById(order.user).select('email firstName lastName');
  if (user) {
    sendOrderStatusUpdate(user, order).catch(() => undefined);
  }

  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
//  ARCHIVE — Archivage par le client
// ─────────────────────────────────────────────────────────────────────────────

const archiveOrder = async (req) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) throw new AppError('Commande introuvable', 404);

  const orderUserId = order.user?._id?.toString?.() || order.user?.toString?.();
  if (orderUserId !== userId) {
    throw new AppError('Accès refusé', 403);
  }

  order.archiveByUser();
  await order.save();

  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE — Suppression admin
// ─────────────────────────────────────────────────────────────────────────────

const deleteOrder = async (req) => {
  const { id } = req.params;
  const order = await Order.findByIdAndDelete(id);
  if (!order) throw new AppError('Commande introuvable', 404);

  if (order.items?.length > 0 && order.status !== 'cancelled') {
    await restoreStock(order.items);
  }

  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  createOrder,
  cancelOrder,
  updateOrderStatus,
  markAsDelivered,
  archiveOrder,
  deleteOrder,
  rollbackOrder,
  // Helpers exportés pour les tests
  computeShippingCost,
  computeCouponDiscount,
  buildOrderItems,
  // Enrichissement des snapshots (lecture + migration)
  enrichSingleItem,
  enrichOrderItems,
  enrichOrders,
  generateTransactionId,
  resolveCart,
  SHIPPING_RATES,
  PAYMENT_EXPIRY_MS,
  VALID_ORDER_STATUSES,
};