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
      type: mongoose.Schema.Types.ObjectId
    },

    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String },
    size: { type: String },
    color: { type: String },

    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true }
  },
  { _id: true }
);


// ─────────────────────────────
// SHIPPING
// ─────────────────────────────
const shippingSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },

    method: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
      default: 'standard'
    },

    cost: { type: Number, default: 0 },
    carrier: { type: String },
    trackingNumber: { type: String },
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

    transactionId: { type: String },
    provider: { type: String },

    paidAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number }
  },
  { _id: false }
);


// ─────────────────────────────
// ORDER
// ─────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true
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
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      ],
      default: 'pending',
      index: true
    },

    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },

    currency: { type: String, default: 'XOF' },

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },

    notes: { type: String },
    cancelReason: { type: String },

    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String
      }
    ]
  },
  { timestamps: true }
);


// ─────────────────────────────
// INDEX (CLEAN & NON DUPLICATE)
// ─────────────────────────────

// user orders pagination
orderSchema.index({ user: 1, createdAt: -1 });

// payment filtering
orderSchema.index({ 'payment.status': 1 });


// ─────────────────────────────
// ORDER NUMBER AUTO GENERATION
// ─────────────────────────────
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    this.orderNumber = `CMD-${timestamp}-${random}`;
  }

  next();
});


// ─────────────────────────────
// EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Order', orderSchema);