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

// Calcul automatique du subtotal
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
// PAYMENT
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
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    transactionId: { type: String, trim: true, index: true },
    provider: { type: String, trim: true },
    details: {
      // Carte bancaire (ne JAMAIS stocker le CVV en clair en production !)
      cardLast4: { type: String }, // Seulement les 4 derniers chiffres
      cardName: { type: String },
      cardExpiry: { type: String },
      
      // Mobile Money
      phoneNumber: { type: String },
      operator: { type: String },
      
      // Virement bancaire
      bankName: { type: String },
      bankReference: { type: String },
    },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, min: 0 }
  },
  { _id: false }
);

// Mettre à jour paidAt automatiquement
paymentSchema.pre('save', async function() {
  if (this.isModified('status') && this.status === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
});


// ─────────────────────────────
// ORDER
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
// orderSchema.index({ orderNumber: 1 }, { unique: true });


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

orderSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelReason = reason || 'Annulé par l\'utilisateur';
  this.addStatusHistory('cancelled', reason || 'Commande annulée');
};


// ─────────────────────────────
// HOOKS
// ─────────────────────────────

// Générer orderNumber automatiquement
orderSchema.pre('save', async function() {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `CMD-${timestamp}-${random}`;
  }
});

// Calculer le total avant sauvegarde
orderSchema.pre('save', async function() {
  if (this.isModified('items') || this.isModified('shippingCost') || this.isModified('discount') || this.isModified('tax')) {
    this.calculateTotal();
  }
});

// Ajouter au statusHistory quand le statut change
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


// ─────────────────────────────
// STATIC METHODS
// ─────────────────────────────
orderSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber: orderNumber.toUpperCase() });
};

orderSchema.statics.getUserOrders = function(userId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const query = { user: userId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('items.product', 'name slug images');
};


// ─────────────────────────────
// EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Order', orderSchema);