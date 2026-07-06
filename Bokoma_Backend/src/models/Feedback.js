// src/models/Feedback.js
const mongoose = require('mongoose');

// ─────────────────────────────
// 🔹 CATÉGORIES DE FEEDBACK
// ─────────────────────────────
// Cinq types distincts tels que définis avec l'équipe :
//   - SITE_FEEDBACK      → impression générale sur le site
//   - PURCHASE_ISSUE     → difficulté rencontrée pendant l'achat
//   - IMPROVEMENT        → suggestion d'amélioration
//   - PRODUCT_OPINION    → avis sur un produit précis (sans rating)
//   - AFTER_SALES        → retour sur le service après-vente / support
const FEEDBACK_CATEGORIES = [
  'site_feedback',
  'purchase_issue',
  'improvement',
  'product_opinion',
  'after_sales',
];

const FEEDBACK_STATUS = ['pending', 'approved', 'rejected', 'archived'];

// ─────────────────────────────
// 🔹 FEEDBACK SCHEMA
// ─────────────────────────────
const feedbackSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════
    // 🔖 CATÉGORIE & SUJET
    // ═══════════════════════════════════════════════
    category: {
      type: String,
      enum: FEEDBACK_CATEGORIES,
      required: [true, 'La catégorie est requise'],
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [120, 'Le sujet ne peut pas dépasser 120 caractères'],
      default: '',
    },
    message: {
      type: String,
      required: [true, 'Le message est requis'],
      trim: true,
      minlength: [10, 'Le message doit contenir au moins 10 caractères'],
      maxlength: [4000, 'Le message ne peut pas dépasser 4000 caractères'],
    },

    // ═══════════════════════════════════════════════
    // ⭐ NOTE OPTIONNELLE
    // ═══════════════════════════════════════════════
    rating: {
      type: Number,
      min: [1, 'La note minimale est 1'],
      max: [5, 'La note maximale est 5'],
      default: null,
    },

    // ═══════════════════════════════════════════════
    // 🧑 AUTEUR
    // ═══════════════════════════════════════════════
    // Lien optionnel à un User — un guest peut aussi laisser un feedback
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Snapshot du nom (récupéré via user.firstName + lastName OU saisi par le guest)
    authorName: {
      type: String,
      trim: true,
      maxlength: [80, 'Le nom ne peut pas dépasser 80 caractères'],
      default: '',
    },
    // Email de contact (pour guests ou pour pouvoir recontacter)
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [120, 'L\'email ne peut pas dépasser 120 caractères'],
      default: '',
    },

    // ═══════════════════════════════════════════════
    // 🛒 CONTEXTE D'ACHAT (pour purchase_issue/after_sales/product_opinion)
    // ═══════════════════════════════════════════════
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },

    // ═══════════════════════════════════════════════
    // 📊 STATUT DE MODÉRATION
    // ═══════════════════════════════════════════════
    status: {
      type: String,
      enum: FEEDBACK_STATUS,
      default: 'pending',
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false, // si true → peut être affiché publiquement
      index: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false, // si true → masque le nom (utilisé côté front)
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: [2000, 'La réponse admin ne peut pas dépasser 2000 caractères'],
      default: '',
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ═══════════════════════════════════════════════
    // 🌐 MÉTADONNÉES TECHNIQUES
    // ═══════════════════════════════════════════════
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────
// 🔹 INDEXES OPTIMISÉS
// ─────────────────────────────

// Listing public modéré + chronologique
feedbackSchema.index({ isPublic: 1, status: 1, createdAt: -1 });

// Modération admin : tous les pending en tête
feedbackSchema.index({ status: 1, createdAt: -1 });

// Filtrage par catégorie
feedbackSchema.index({ category: 1, isPublic: 1, createdAt: -1 });

// ─────────────────────────────
// 🔹 VIRTUALS
// ─────────────────────────────

// Libellé humain de la catégorie
feedbackSchema.virtual('categoryLabel').get(function () {
  const labels = {
    site_feedback:   'Avis sur le site',
    purchase_issue:  'Difficulté d\'achat',
    improvement:     "Suggestion d'amélioration",
    product_opinion: 'Avis produit',
    after_sales:     'Service après-vente',
  };
  return labels[this.category] || this.category;
});

// Emoji pour affichage rapide
feedbackSchema.virtual('categoryEmoji').get(function () {
  const emojis = {
    site_feedback:   '💬',
    purchase_issue:  '⚠️',
    improvement:     '💡',
    product_opinion: '⭐',
    after_sales:     '🛠️',
  };
  return emojis[this.category] || '✉️';
});

// Temps relatif (FR)
feedbackSchema.virtual('relativeTime').get(function () {
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

// Aperçu du message (utile pour listings admin)
feedbackSchema.virtual('excerpt').get(function () {
  if (!this.message) return '';
  if (this.message.length <= 140) return this.message;
  return this.message.slice(0, 140).trimEnd() + '…';
});

// ─────────────────────────────
// 🔹 INSTANCE METHODS
// ─────────────────────────────

// Approuver + rendre public (en option)
feedbackSchema.methods.approve = async function (opts = {}) {
  this.status = 'approved';
  if (opts.makePublic) this.isPublic = true;
  return this.save();
};

// Rejeter
feedbackSchema.methods.reject = async function () {
  this.status = 'rejected';
  this.isPublic = false;
  return this.save();
};

// Répondre en tant qu'admin
feedbackSchema.methods.respond = async function (response, adminId) {
  this.adminResponse = response;
  this.respondedAt = new Date();
  this.respondedBy = adminId;
  return this.save();
};

// ─────────────────────────────
// 🔹 STATIC METHODS
// ─────────────────────────────

// Liste publique (côté front) : approuvés ET publics, paginée
feedbackSchema.statics.findPublic = function (
  { page = 1, limit = 12, category } = {}
) {
  const skip = (page - 1) * limit;
  const filter = { status: 'approved', isPublic: true };
  if (category) filter.category = category;

  return this.find(filter)
    .populate('user', 'firstName lastName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Statistiques pour le dashboard admin
feedbackSchema.statics.getStats = async function () {
  const counts = await this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = counts.reduce(
    (acc, c) => ({ ...acc, [c._id]: c.count }),
    { pending: 0, approved: 0, rejected: 0, archived: 0 }
  );

  const byCategory = await this.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const avgRatingAgg = await this.aggregate([
    { $match: { rating: { $ne: null }, status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = avgRatingAgg[0]?.avg ?? 0;

  return {
    byStatus,
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    pendingCount: byStatus.pending,
    byCategory,
    avgRating: Math.round(avgRating * 10) / 10,
  };
};

// ─────────────────────────────
// 🔹 EXPORT
// ─────────────────────────────
feedbackSchema.statics.CATEGORIES = FEEDBACK_CATEGORIES;
feedbackSchema.statics.STATUSES = FEEDBACK_STATUS;

module.exports = mongoose.model('Feedback', feedbackSchema);
