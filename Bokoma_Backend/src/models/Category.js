const mongoose = require('mongoose');


// ─────────────────────────────
// CATEGORY
// ─────────────────────────────
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    description: {
      type: String
    },

    image: {
      type: String
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


// ─────────────────────────────
// VIRTUAL (SOUS-CATEGORIES)
// ─────────────────────────────
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});


// ─────────────────────────────
// INDEX (CLEAN)
// ─────────────────────────────
categorySchema.index({ parent: 1, order: 1 });


// ─────────────────────────────
// EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Category', categorySchema);