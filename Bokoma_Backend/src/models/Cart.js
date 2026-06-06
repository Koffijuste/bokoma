const mongoose = require('mongoose');


// ─────────────────────────────
// CART ITEM
// ─────────────────────────────
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId
    },

    sku: String,
    name: String,
    image: String,
    size: String,
    color: String,

    price: {
      type: Number,
      required: true,
      min: 0
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  },
  { _id: true, timestamps: true }
);


// ─────────────────────────────
// CART
// ─────────────────────────────
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true
    },

    sessionId: {
      type: String,
      index: true
    },

    items: [cartItemSchema],

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },

    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


// ─────────────────────────────
// VIRTUALS
// ─────────────────────────────
cartSchema.virtual('total').get(function () {
  return this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
});

cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
});


// ─────────────────────────────
// INDEXES (ONLY HERE)
// ─────────────────────────────
cartSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);


// ─────────────────────────────
// EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Cart', cartSchema);