// src/models/Product.js
const mongoose = require('mongoose');

// ─────────────────────────────
// 🔹 SUB-SCHEMAS (Embedded Documents)
// ─────────────────────────────

/**
 * Image d'un produit
 * Note: _id: false pour éviter des IDs inutiles sur les sous-documents
 */
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true }, // Pour suppression Cloudinary
    alt: { type: String, default: '', trim: true },
    isPrimary: { type: Boolean, default: false },
    isUploaded: { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * Attribut produit (ex: { key: "Matière", value: "Cuir" })
 */
const attributeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/**
 * Variante d'un produit (taille, couleur, stock spécifique)
 * ⚠️ Note: `unique: true` sur sku ne fonctionne QUE au niveau du document produit,
 * pas globalement. Pour une unicité globale, il faudrait un index compound ou une validation custom.
 */
const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true }, // Retirer unique: true si problèmes

    size: { type: String, trim: true },      // S, M, L, 42, 100ml...
    color: { type: String, trim: true },     // Noir, Rouge...

    stock: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, min: 0 },         // Prix spécifique à la variante

    images: [{ type: String }],              // URLs d'images spécifiques
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─────────────────────────────
// 🔹 PRODUCT SCHEMA
// ─────────────────────────────
const productSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════
    // 📦 INFORMATIONS DE BASE
    // ═══════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════
    // 🔗 RELATIONS
    // ═══════════════════════════════════════════════
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La catégorie est requise'],
      index: true,
    },

    // ═══════════════════════════════════════════════
    // 🏷️ CLASSIFICATION
    // ═══════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════
    // 💰 PRIX & DEVISE
    // ═══════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════
    // 🖼️ MÉDIAS
    // ═══════════════════════════════════════════════
    images: [imageSchema],

    // ═══════════════════════════════════════════════
    // 📦 STOCK & VARIANTES
    // ═══════════════════════════════════════════════
    variants: [variantSchema],
    totalStock: { type: Number, default: 0, index: true },

    // ═══════════════════════════════════════════════
    // 🏷️ MÉTADONNÉES
    // ═══════════════════════════════════════════════
    attributes: [attributeSchema],
    tags: [{ type: String, trim: true, lowercase: true }],

    // ═══════════════════════════════════════════════
    // 📊 STATUT & VISIBILITÉ
    // ═══════════════════════════════════════════════
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isNewProduct: { type: Boolean, default: false, index: true },

    // ═══════════════════════════════════════════════
    // 📈 VENTES & NOTES
    // ═══════════════════════════════════════════════
    soldCount: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },

    // ═══════════════════════════════════════════════
    // 🔍 SEO
    // ═══════════════════════════════════════════════
    seo: {
      metaTitle: { type: String, trim: true, maxlength: 60 },
      metaDescription: { type: String, trim: true, maxlength: 160 },
    },

    // ═══════════════════════════════════════════════
    // ⭐ REVIEWS (Avis clients)
    // ═══════════════════════════════════════════════
    reviews: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    }],
  },
  {
    timestamps: true, // createdAt, updatedAt automatiques
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────
// 🔹 INDEXES OPTIMISÉS
// ─────────────────────────────
// Recherche texte (name, description, tags)
productSchema.index({ name: 'text', description: 'text', tags: 'text' }, {
  name: 'product_search_idx',
  weights: { name: 10, description: 5, tags: 2 },
});

// Filtres courants
productSchema.index({ category: 1, type: 1, isActive: 1 });
productSchema.index({ basePrice: 1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ isNewProduct: 1, isActive: 1 });

// ─────────────────────────────
// 🔹 VIRTUALS (Champs calculés)
// ─────────────────────────────

// Pourcentage de réduction
productSchema.virtual('discountPercent').get(function () {
  if (!this.comparePrice || this.comparePrice <= this.basePrice) return 0;
  return Math.round(((this.comparePrice - this.basePrice) / this.comparePrice) * 100);
});

// Disponibilité
productSchema.virtual('inStock').get(function () {
  return this.totalStock > 0;
});

// URL d'image principale (raccourci)
productSchema.virtual('mainImage').get(function () {
  const primary = this.images?.find(img => img.isPrimary);
  return primary?.url || this.images?.[0]?.url || null;
});

// ─────────────────────────────
// 🔹 INSTANCE METHODS
// ─────────────────────────────

// Vérifier si une variante est en stock
productSchema.methods.isVariantInStock = function (variantId) {
  const variant = this.variants.id(variantId);
  return variant?.stock > 0;
};

// Obtenir le prix minimum (parmi les variantes)
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

// Recherche rapide par slug
productSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, isActive: true });
};

// Produits en vedette
productSchema.statics.findFeatured = function (limit = 8) {
  return this.find({ isFeatured: true, isActive: true })
    .limit(limit)
    .sort({ createdAt: -1 });
};

// ─────────────────────────────
// 🔹 MIDDLEWARE / HOOKS
// ─────────────────────────────

// Avant sauvegarde : recalcul stock + normalisation
productSchema.pre('save', function (next) {
  try {
    // 🔁 Recalcul du stock total depuis les variantes
    this.totalStock = (this.variants || []).reduce(
      (sum, v) => sum + (Number(v.stock) || 0),
      0
    );

    // ✅ Sécurité: isActive par défaut à true
    if (this.isActive == null) {
      this.isActive = true;
    }

    // 💰 Normalisation des prix
    if (this.basePrice != null) {
      this.basePrice = Number(this.basePrice) || 0;
    }
    if (this.comparePrice != null) {
      this.comparePrice = Number(this.comparePrice) || undefined;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Après sauvegarde : log (dev uniquement)
productSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Product saved: ${doc.name} (${doc._id})`);
  }
});

// ─────────────────────────────
// 🔹 EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Product', productSchema);