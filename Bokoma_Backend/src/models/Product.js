// src/models/Product.js
const mongoose = require('mongoose');

// ─────────────────────────────
// 🔹 SUB-SCHEMAS
// ─────────────────────────────

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    alt: { type: String, default: '', trim: true },
    isPrimary: { type: Boolean, default: false },
    isUploaded: { type: Boolean, default: true },
  },
  { _id: false }
);

const attributeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// ✅ CORRECTION : Retirer required: true sur sku
const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true }, // ✅ Plus de required, plus de unique
    
    size: { type: String, trim: true },
    color: { type: String, trim: true },
    
    stock: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, min: 0 },
    
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─────────────────────────────
// 🔹 PRODUCT SCHEMA
// ─────────────────────────────
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom du produit est requis'],
      trim: true,
      maxlength: [200, 'Le nom ne peut pas dépasser 200 caractères'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      maxlength: [5000, 'La description ne peut pas dépasser 5000 caractères'],
    },
    shortDesc: {
      type: String,
      trim: true,
      maxlength: [500, 'La description courte ne peut pas dépasser 500 caractères'],
    },
    
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La catégorie est requise'],
      index: true,
    },
    
    brand: { type: String, trim: true, maxlength: 100 },
    type: {
      type: String,
      required: true,
      enum: {
        values: ['shoes', 'perfume', 'clothing', 'accessory'],
        message: '{VALUE} n\'est pas un type valide',
      },
      index: true,
    },
    
    basePrice: {
      type: Number,
      required: [true, 'Le prix de base est requis'],
      min: [0, 'Le prix ne peut pas être négatif'],
    },
    comparePrice: {
      type: Number,
      min: [0, 'Le prix comparé ne peut pas être négatif'],
    },
    currency: { type: String, default: 'XOF', enum: ['XOF', 'EUR', 'USD'] },
    
    images: [imageSchema],
    
    variants: [variantSchema],
    totalStock: { type: Number, default: 0, index: true },
    
    attributes: [attributeSchema],
    tags: [{ type: String, trim: true, lowercase: true }],
    
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isNewProduct: { type: Boolean, default: false, index: true },
    
    soldCount: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    
    seo: {
      metaTitle: { type: String, trim: true, maxlength: 60 },
      metaDescription: { type: String, trim: true, maxlength: 160 },
    },
    
    reviews: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────
// 🔹 INDEXES
// ─────────────────────────────
productSchema.index({ name: 'text', description: 'text', tags: 'text' }, {
  name: 'product_search_idx',
  weights: { name: 10, description: 5, tags: 2 },
});

productSchema.index({ category: 1, type: 1, isActive: 1 });
productSchema.index({ basePrice: 1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ isNewProduct: 1, isActive: 1 });

// ─────────────────────────────
// 🔹 VIRTUALS
// ─────────────────────────────
productSchema.virtual('discountPercent').get(function () {
  if (!this.comparePrice || this.comparePrice <= this.basePrice) return 0;
  return Math.round(((this.comparePrice - this.basePrice) / this.comparePrice) * 100);
});

productSchema.virtual('inStock').get(function () {
  return this.totalStock > 0;
});

productSchema.virtual('mainImage').get(function () {
  const primary = this.images?.find(img => img.isPrimary);
  return primary?.url || this.images?.[0]?.url || null;
});

// ─────────────────────────────
// 🔹 INSTANCE METHODS
// ─────────────────────────────
productSchema.methods.isVariantInStock = function (variantId) {
  const variant = this.variants.id(variantId);
  return variant?.stock > 0;
};

productSchema.methods.getMinPrice = function () {
  const variantPrices = this.variants
    .filter(v => v.isActive && v.price != null)
    .map(v => v.price);
  
  return variantPrices.length > 0 
    ? Math.min(...variantPrices) 
    : this.basePrice;
};

// ─────────────────────────────
// 🔹 STATIC METHODS
// ─────────────────────────────
productSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, isActive: true });
};

productSchema.statics.findFeatured = function (limit = 8) {
  return this.find({ isFeatured: true, isActive: true })
    .limit(limit)
    .sort({ createdAt: -1 });
};

// ─────────────────────────────
// 🔹 MIDDLEWARE / HOOKS
// ─────────────────────────────

// ✅ CORRECTION CRITIQUE : Ne pas écraser totalStock si pas de variantes
productSchema.pre('save', async function() {
  try {
    // ✅ Seulement recalculer si des variantes existent
    if (this.variants && this.variants.length > 0) {
      this.totalStock = this.variants.reduce(
        (sum, v) => sum + (Number(v.stock) || 0),
        0
      );
    }
    // ✅ Sinon, garder la valeur de totalStock envoyée depuis le frontend

    if (this.isActive == null) {
      this.isActive = true;
    }

    if (this.basePrice != null) {
      this.basePrice = Number(this.basePrice) || 0;
    }
    if (this.comparePrice != null) {
      this.comparePrice = Number(this.comparePrice) || undefined;
    }
  } catch (err) {
    console.error('❌ [Product] Pre-save error:', err);
  }
});

productSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Product saved: ${doc.name} (${doc._id}), stock: ${doc.totalStock}`);
  }
});

// ─────────────────────────────
// 🔹 EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Product', productSchema);