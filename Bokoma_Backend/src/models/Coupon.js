const mongoose = require('mongoose');


// ─────────────────────────────
// COUPON
// ─────────────────────────────
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },

    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },

    value: {
      type: Number,
      required: true,
      min: 0
    },

    minOrderAmount: {
      type: Number,
      default: 0
    },

    maxDiscount: {
      type: Number
    },

    usageLimit: {
      type: Number
    },

    usagePerUser: {
      type: Number,
      default: 1
    },

    usedCount: {
      type: Number,
      default: 0
    },

    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    applicableTo: {
      categories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category'
        }
      ],

      products: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        }
      ]
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    startsAt: {
      type: Date,
      default: Date.now
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);


// ─────────────────────────────
// INDEX (CLEAN & NON REDONDANT)
// ─────────────────────────────
couponSchema.index({ isActive: 1, expiresAt: 1 });


// ─────────────────────────────
// EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Coupon', couponSchema);