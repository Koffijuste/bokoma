// src/models/GalleryItem.js
const mongoose = require('mongoose');

// ─────────────────────────────
// 🔹 GALLERY ITEM SCHEMA
// ─────────────────────────────
const galleryItemSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════
    // 🔖 IDENTITÉ
    // ═══════════════════════════════════════════════
    title: {
      type: String,
      required: [true, 'Le titre est requis'],
      trim: true,
      maxlength: [120, 'Le titre ne peut pas dépasser 120 caractères'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
      default: '',
    },

    // ═══════════════════════════════════════════════
    // 🎬 TYPE & MÉDIA
    // ═══════════════════════════════════════════════
    type: {
      type: String,
      enum: ['image', 'video'],
      required: [true, 'Le type (image ou vidéo) est requis'],
      index: true,
    },
    // URL publique du média (Cloudinary ou upload local)
    url: {
      type: String,
      required: [true, "L'URL du média est requise"],
      trim: true,
    },
    // Vignette pour les vidéos (optionnelle, sinon on dérive de url)
    thumbnail: {
      type: String,
      trim: true,
      default: '',
    },
    // Pour les vidéos : provider (cloudinary/youtube/vimeo/mp4/facebook/tiktok/instagram/x/…)
    provider: {
      type: String,
      enum: ['cloudinary', 'youtube', 'vimeo', 'mp4', 'local', 'facebook', 'tiktok', 'instagram', 'x', 'other'],
      default: 'cloudinary',
    },

    // ═══════════════════════════════════════════════
    // 🏷️ CATÉGORISATION
    // ═══════════════════════════════════════════════
    category: {
      type: String,
      enum: [
        'collection',
        'lookbook',
        'produit',
        'evenement',
        'temoignage',
        'arriere-boutique',
        'autre',
      ],
      default: 'produit',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },

    // ═══════════════════════════════════════════════
    // 🔗 LIEN FACULTATIF À UN PRODUIT
    // ═══════════════════════════════════════════════
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },

    // ═══════════════════════════════════════════════
    // 📐 MÉTADONNÉES TECHNIQUES (auto-remplies)
    // ═══════════════════════════════════════════════
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null }, // secondes, pour vidéos

    // ═══════════════════════════════════════════════
    // 📊 STATUT & ORDRE
    // ═══════════════════════════════════════════════
    isPublished: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0, index: true },

    // ═══════════════════════════════════════════════
    // 👤 AUTEUR (admin qui a ajouté l'élément)
    // ═══════════════════════════════════════════════
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
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
galleryItemSchema.index({ isPublished: 1, order: -1, createdAt: -1 });
galleryItemSchema.index({ type: 1, isPublished: 1, createdAt: -1 });
galleryItemSchema.index({ category: 1, isPublished: 1, order: -1 });

// ─────────────────────────────
// 🔹 VIRTUALS
// ─────────────────────────────

// URL d'affichage (utilise thumbnail si vidéo, sinon url)
galleryItemSchema.virtual('displayUrl').get(function () {
  if (this.type === 'video' && this.thumbnail) return this.thumbnail;
  return this.url;
});

// Vérifie si c'est un média externe (YouTube/Vimeo)
galleryItemSchema.virtual('isExternalVideo').get(function () {
  return this.type === 'video' && ['youtube', 'vimeo'].includes(this.provider);
});

// Temps relatif
galleryItemSchema.virtual('relativeTime').get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return this.createdAt.toLocaleDateString('fr-FR');
  if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  if (hours > 0) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
  return 'à l\'instant';
});

// ─────────────────────────────
// 🔹 STATIC METHODS
// ─────────────────────────────

// Liste publique paginée avec filtres optionnels
galleryItemSchema.statics.findPublic = function (
  { page = 1, limit = 24, type, category, featuredOnly = false } = {}
) {
  const skip = (page - 1) * limit;
  const filter = { isPublished: true };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (featuredOnly) filter.isFeatured = true;

  return this.find(filter)
    .sort({ isFeatured: -1, order: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// ─────────────────────────────
// 🔹 EXPORT
// ─────────────────────────────
module.exports = mongoose.model('GalleryItem', galleryItemSchema);
