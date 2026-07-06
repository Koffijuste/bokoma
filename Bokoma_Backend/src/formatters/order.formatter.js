// src/formatters/order.formatter.js
// ============================================================================
// 📦 ORDER FORMATTER — Centralise les DTOs renvoyés par l'API
// ============================================================================

/**
 * Formate une commande pour la réponse API (client).
 * Garantit que toutes les routes renvoient la même structure.
 */
const formatOrderForClient = (order) => {
  if (!order) return null;

  const o = order.toObject ? order.toObject({ virtuals: true }) : order;

  return {
    _id: o._id?.toString(),
    orderNumber: o.orderNumber,
    status: o.status,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    discount: o.discount,
    tax: o.tax,
    total: o.total,
    currency: o.currency,
    notes: o.notes,
    cancelReason: o.cancelReason,
    itemsCount: o.items?.length || 0,

    user: o.user && typeof o.user === 'object'
      ? {
          _id: o.user._id?.toString(),
          firstName: o.user.firstName,
          lastName: o.user.lastName,
          name: `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim(),
          email: o.user.email,
          phone: o.user.phone,
          avatar: o.user.avatar,
        }
      : null,

    items: (o.items || []).map(formatOrderItem),
    shipping: formatShipping(o.shipping),
    payment: formatPayment(o.payment),
    coupon: formatCoupon(o.coupon),

    statusHistory: o.statusHistory || [],
    paymentExpiresAt: o.paymentExpiresAt,
    archivedByUser: o.archivedByUser,
    archivedAt: o.archivedAt,

    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

/**
 * Formate un item de commande
 */
const formatOrderItem = (item) => {
  if (!item) return null;

  return {
    _id: item._id?.toString(),
    product: item.product && typeof item.product === 'object'
      ? {
          _id: item.product._id?.toString(),
          name: item.product.name,
          slug: item.product.slug,
          basePrice: item.product.basePrice,
          description: item.product.description,
          images: item.product.images,
        }
      : null,
    variant: item.variant || null,
    name: item.name,
    sku: item.sku,
    image: item.image,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
  };
};

/**
 * Formate les informations de livraison
 */
const formatShipping = (shipping) => {
  if (!shipping) return null;

  return {
    fullName: shipping.fullName,
    phone: shipping.phone,
    street: shipping.street,
    city: shipping.city,
    postalCode: shipping.postalCode,
    country: shipping.country,
    method: shipping.method,
    cost: shipping.cost,
    carrier: shipping.carrier,
    trackingNumber: shipping.trackingNumber,
    estimatedAt: shipping.estimatedAt,
    deliveredAt: shipping.deliveredAt,
  };
};

/**
 * Formate les informations de paiement (vue publique — masque les détails sensibles)
 */
const formatPayment = (payment) => {
  if (!payment) return null;

  return {
    method: payment.method,
    status: payment.status,
    provider: payment.provider,
    transactionId: payment.transactionId,
    amountPaid: payment.amountPaid,
    remainingAmount: payment.remainingAmount,
    isPartialPayment: (payment.remainingAmount || 0) > 0,
    paidAt: payment.paidAt,
    failedAt: payment.failedAt,
    expiredAt: payment.expiredAt,
    rejectionReason: payment.rejectionReason,
    // details volontairement omis — contient des données sensibles
  };
};

/**
 * Formate un coupon embarqué dans la commande
 */
const formatCoupon = (coupon) => {
  if (!coupon) return null;
  if (typeof coupon === 'string' || coupon.toString === Object.prototype.toString) {
    return { _id: coupon.toString() };
  }

  return {
    _id: coupon._id?.toString(),
    code: coupon.code,
    discount: coupon.type === 'percentage'
      ? `${coupon.value}%`
      : `${coupon.value} FCFA`,
  };
};

/**
 * Formate une réponse paginée de liste de commandes
 */
const formatOrderList = (orders, total, page, limit) => {
  return {
    orders: orders.map(formatOrderForClient),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

/**
 * Formate une commande pour la vérification publique (sans auth).
 * Masque les données sensibles de l'utilisateur.
 */
const formatOrderForPublic = (order) => {
  if (!order) return null;

  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    discount: order.discount,
    total: order.total,
    currency: order.currency,
    itemCount: order.items?.length || 0,
    notes: order.notes,
    shipping: order.shipping ? {
      fullName: order.shipping.fullName,
      phone: order.shipping.phone,
      street: order.shipping.street,
      city: order.shipping.city,
      postalCode: order.shipping.postalCode,
      country: order.shipping.country,
    } : null,
    payment: order.payment ? {
      method: order.payment.method,
      status: order.payment.status,
      amountPaid: order.payment.amountPaid || 0,
      remainingAmount: order.payment.remainingAmount || 0,
      isPartialPayment: (order.payment.remainingAmount || 0) > 0,
    } : null,
    items: (order.items || []).map(item => ({
      _id: item._id?.toString(),
      name: item.name || item.product?.name || 'Produit',
      quantity: item.quantity,
      price: item.price,
      subtotal: (item.price || 0) * (item.quantity || 1),
      size: item.size,
      color: item.color,
      image: item.image || item.product?.images?.[0]?.url || null,
      product: item.product ? {
        _id: item.product._id?.toString(),
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.images?.[0]?.url || null,
      } : null,
    })),
  };
};

module.exports = {
  formatOrderForClient,
  formatOrderItem,
  formatShipping,
  formatPayment,
  formatCoupon,
  formatOrderList,
  formatOrderForPublic,
};