const mongoose = require('mongoose');

// ─────────────────────────────
// ORDER ITEM
// ─────────────────────────────
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product.variants'
    },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    image: { type: String },
    size: { type: String, trim: true },
    color: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: true }
);

orderItemSchema.pre('validate', async function() {
  if (this.price && this.quantity) {
    this.subtotal = this.price * this.quantity;
  }
});


// ─────────────────────────────
// SHIPPING
// ─────────────────────────────
const shippingSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { 
      type: String, 
      trim: true,
      default: '',
    },
    country: { type: String, required: true, trim: true },
    method: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
      default: 'standard'
    },
    cost: { type: Number, default: 0, min: 0 },
    carrier: { type: String, trim: true },
    trackingNumber: { type: String, trim: true },
    estimatedAt: { type: Date },
    deliveredAt: { type: Date }
  },
  { _id: false }
);


// ─────────────────────────────
// PAYMENT (MIS À JOUR avec champs de vérification)
// ─────────────────────────────
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['card', 'mobile_money', 'cash_on_delivery', 'bank_transfer'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded', 'partial'],
      default: 'pending'
    },
    transactionId: { type: String, trim: true, index: true },
    provider: { type: String, trim: true },
    amountPaid: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0, min: 0 },
    rejectionReason: { type: String, trim: true },
    details: {
      cardLast4: { type: String },
      cardName: { type: String },
      cardExpiry: { type: String },
      phoneNumber: { type: String },
      operator: { type: String },
      bankName: { type: String },
      bankReference: { type: String },
    },
    paidAt: { type: Date },
    failedAt: { type: Date },
    expiredAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, min: 0 },
    
    // ✅ NOUVEAUX CHAMPS : Suivi des vérifications API
    verificationAttempts: { 
      type: Number, 
      default: 0,
      min: 0,
    },
    lastVerificationAt: { 
      type: Date,
    },
    verificationBlocked: { 
      type: Boolean, 
      default: false,
    },
    verificationBlockedReason: { 
      type: String, 
      trim: true,
    },
  },
  { _id: false }
);

paymentSchema.pre('save', async function() {
  if (this.isModified('status')) {
    const now = new Date();
    if (this.status === 'paid' && !this.paidAt) this.paidAt = now;
    if (this.status === 'failed' && !this.failedAt) this.failedAt = now;
    if (this.status === 'expired' && !this.expiredAt) this.expiredAt = now;
  }
});


// ─────────────────────────────
// ORDER (MIS À JOUR)
// ─────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
      uppercase: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    items: [orderItemSchema],
    shipping: shippingSchema,
    payment: paymentSchema,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
      index: true
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'XOF', uppercase: true },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    notes: { type: String, trim: true },
    cancelReason: { type: String, trim: true },
    
    // ✅ Gestion de l'expiration du paiement
    paymentExpiresAt: { 
      type: Date, 
      default: function() {
        return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      }
    },
    paymentNotified: {
      reminder: { type: Boolean, default: false },
      expired: { type: Boolean, default: false },
    },
    
    // ✅ NOUVEAU : Archivage par le client
    archivedByUser: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
    
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        note: { type: String, trim: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


// ─────────────────────────────
// INDEX COMPOSÉS
// ─────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1, createdAt: -1 });
orderSchema.index({ 
  'payment.status': 1, 
  paymentExpiresAt: 1, 
  'paymentNotified.expired': 1 
});
// ✅ Index pour filtrer les commandes à vérifier
orderSchema.index({
  'payment.status': 1,
  'payment.verificationAttempts': 1,
  'payment.lastVerificationAt': 1,
  'payment.verificationBlocked': 1,
});
// ✅ NOUVEAU : Index pour les commandes archivées
orderSchema.index({ user: 1, archivedByUser: 1, createdAt: -1 });


// ─────────────────────────────
// VIRTUALS
// ─────────────────────────────
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
});

orderSchema.virtual('isPaid').get(function() {
  return this.payment?.status === 'paid';
});

orderSchema.virtual('isDelivered').get(function() {
  return this.status === 'delivered';
});

orderSchema.virtual('isCancelled').get(function() {
  return this.status === 'cancelled';
});

orderSchema.virtual('isPaymentExpired').get(function() {
  if (this.payment?.status !== 'pending') return false;
  return new Date() > this.paymentExpiresAt;
});

orderSchema.virtual('paymentTimeRemainingMs').get(function() {
  if (this.payment?.status !== 'pending') return 0;
  return Math.max(0, this.paymentExpiresAt - new Date());
});

orderSchema.virtual('isArchived').get(function() {
  return this.archivedByUser === true;
});


// ─────────────────────────────
// MÉTHODES
// ─────────────────────────────
orderSchema.methods.calculateTotal = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  this.total = Math.max(0, this.subtotal + this.shippingCost - this.discount + this.tax);
  return this.total;
};

orderSchema.methods.addStatusHistory = function(status, note, changedBy) {
  this.statusHistory.push({
    status,
    note: note || `Statut changé à ${status}`,
    changedBy: changedBy || null
  });
  this.status = status;
};

orderSchema.methods.markAsPaid = function(transactionId, provider) {
  this.payment.status = 'paid';
  this.payment.paidAt = new Date();
  if (transactionId) this.payment.transactionId = transactionId;
  if (provider) this.payment.provider = provider;
  this.addStatusHistory('processing', 'Paiement confirmé');
};

orderSchema.methods.markAsFailed = function(reason) {
  this.payment.status = 'failed';
  this.payment.failedAt = new Date();
  this.payment.rejectionReason = reason || 'Paiement échoué';
  this.status = 'cancelled';
  this.cancelReason = reason || 'Paiement échoué';
  this.addStatusHistory('cancelled', reason || 'Paiement échoué');
};

orderSchema.methods.markAsExpired = function() {
  this.payment.status = 'expired';
  this.payment.expiredAt = new Date();
  this.payment.rejectionReason = 'Délai de paiement dépassé (5 minutes)';
  this.status = 'cancelled';
  this.cancelReason = 'Paiement expiré';
  this.paymentNotified.expired = true;
  this.addStatusHistory('cancelled', 'Paiement expiré - Commande annulée automatiquement');
};

orderSchema.methods.rejectPayment = function(reason, adminId) {
  this.payment.status = 'failed';
  this.payment.failedAt = new Date();
  this.payment.rejectionReason = reason || 'Paiement rejeté par l\'administrateur';
  this.status = 'cancelled';
  this.cancelReason = reason || 'Paiement rejeté';
  this.addStatusHistory('cancelled', reason || 'Paiement rejeté par admin', adminId);
};

orderSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelReason = reason || 'Annulé par l\'utilisateur';
  this.addStatusHistory('cancelled', reason || 'Commande annulée');
};

// ✅ NOUVEAU : Archiver la commande (masquer du profil client)
orderSchema.methods.archiveByUser = function() {
  this.archivedByUser = true;
  this.archivedAt = new Date();
};


// ─────────────────────────────
// HOOKS
// ─────────────────────────────
orderSchema.pre('save', async function() {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `CMD-${timestamp}-${random}`;
  }
});

orderSchema.pre('save', async function() {
  if (this.isModified('items') || this.isModified('shippingCost') || this.isModified('discount') || this.isModified('tax')) {
    this.calculateTotal();
  }
});

orderSchema.pre('save', async function() {
  if (this.isModified('status')) {
    const lastHistory = this.statusHistory[this.statusHistory.length - 1];
    if (!lastHistory || lastHistory.status !== this.status) {
      this.statusHistory.push({
        status: this.status,
        note: `Statut mis à jour à ${this.status}`,
        changedAt: new Date()
      });
    }
  }
});

orderSchema.pre('save', async function() {
  if (this.isNew && !this.paymentExpiresAt) {
    this.paymentExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  }
});


// ─────────────────────────────
// STATIC METHODS
// ─────────────────────────────
orderSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber: orderNumber.toUpperCase() });
};

orderSchema.statics.getUserOrders = function(userId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const query = { 
    user: userId,
    archivedByUser: { $ne: true } // ✅ Exclure les commandes archivées
  };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('items.product', 'name slug images');
};

orderSchema.statics.getExpiredPendingPayments = function() {
  const now = new Date();
  return this.find({
    'payment.status': 'pending',
    paymentExpiresAt: { $lt: now },
    'paymentNotified.expired': { $ne: true },
  }).populate('user', 'firstName lastName email phone');
};

orderSchema.statics.getPaymentsToRemind = function() {
  const now = new Date();
  const reminderThreshold = new Date(now.getTime() + 2 * 60 * 1000); // 2 min avant
  
  return this.find({
    'payment.status': 'pending',
    paymentExpiresAt: { $gt: now, $lt: reminderThreshold },
    'paymentNotified.reminder': { $ne: true },
  }).populate('user', 'firstName lastName email phone');
};


// ─────────────────────────────
// EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Order', orderSchema);