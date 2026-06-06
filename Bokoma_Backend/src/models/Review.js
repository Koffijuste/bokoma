// src/models/Review.js
const mongoose = require('mongoose');

// ─────────────────────────────
// 🔹 REVIEW SCHEMA
// ─────────────────────────────
const reviewSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════
    // 🔗 RELATIONS
    // ═══════════════════════════════════════════════
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Le produit est requis'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur est requis"],
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      // Optionnel : un review peut être laissé sans commande (guest review)
    },

    // ═══════════════════════════════════════════════
    // ⭐ NOTE & CONTENU
    // ═══════════════════════════════════════════════
    rating: {
      type: Number,
      required: [true, 'La note est requise'],
      min: [1, 'La note minimale est 1'],
      max: [5, 'La note maximale est 5'],
      validate: {
        validator: Number.isInteger,
        message: 'La note doit être un nombre entier',
      },
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères'],
    },
    body: {
      type: String,
      required: [true, 'Le commentaire est requis'],
      trim: true,
      minlength: [10, 'Le commentaire doit contenir au moins 10 caractères'],
      maxlength: [2000, 'Le commentaire ne peut pas dépasser 2000 caractères'],
    },

    // ═══════════════════════════════════════════════
    // 🖼️ MÉDIAS
    // ═══════════════════════════════════════════════
    images: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: 'Maximum 5 images par avis',
      },
    },

    // ═══════════════════════════════════════════════
    // 📊 MÉTADONNÉES & STATUT
    // ═══════════════════════════════════════════════
    isVerifiedPurchase: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false, index: true },
    helpfulCount: { type: Number, default: 0, min: 0 },
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

// ✅ 1 avis maximum par utilisateur pour un produit donné
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// ✅ Filtrage rapide : produit + avis approuvés
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });

// ✅ Liste des avis d'un utilisateur
reviewSchema.index({ user: 1, createdAt: -1 });

// ✅ Admin : modération des avis en attente
reviewSchema.index({ isApproved: 1, createdAt: 1 });

// ─────────────────────────────
// 🔹 VIRTUALS (Champs calculés)
// ─────────────────────────────

// Formatage de la note (ex: 4.5 → "4,5/5")
reviewSchema.virtual('formattedRating').get(function () {
  return `${this.rating.toFixed(1)}/5`;
});

// Temps relatif (ex: "il y a 3 jours")
reviewSchema.virtual('relativeTime').get(function () {
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
// 🔹 INSTANCE METHODS
// ─────────────────────────────

// Marquer l'avis comme utile
reviewSchema.methods.markHelpful = async function () {
  this.helpfulCount = (this.helpfulCount || 0) + 1;
  return this.save();
};

// Vérifier si c'est un achat vérifié
reviewSchema.methods.isVerified = function () {
  return this.isVerifiedPurchase && !!this.order;
};

// ─────────────────────────────
// 🔹 STATIC METHODS
// ─────────────────────────────

// Récupérer les avis approuvés d'un produit avec pagination
reviewSchema.statics.findApprovedByProduct = function (productId, { page = 1, limit = 10, sort = '-createdAt' } = {}) {
  const skip = (page - 1) * limit;
  
  return this.find({ product: productId, isApproved: true })
    .populate('user', 'firstName lastName avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

// Calculer les statistiques de notes pour un produit
reviewSchema.statics.getRatingStats = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  // Format: { '5': 12, '4': 5, '3': 2, '2': 1, '1': 0 }
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  stats.forEach((s) => {
    distribution[s._id] = s.count;
  });

  return { distribution, total: Object.values(distribution).reduce((a, b) => a + b, 0) };
};

// ─────────────────────────────
// 🔹 MIDDLEWARE / HOOKS
// ─────────────────────────────

// ✅ Après création : mettre à jour la note moyenne du produit
reviewSchema.post('save', async function () {
  await updateProductRating(this.product);
});

// ✅ Après modification : recalculer si rating ou isApproved change
reviewSchema.post('findOneAndUpdate', async function (doc) {
  if (doc && (this.getUpdate().rating !== undefined || this.getUpdate().isApproved !== undefined)) {
    await updateProductRating(doc.product);
  }
});

// ✅ Après suppression : recalculer la note du produit
reviewSchema.post('deleteOne', { document: true, query: false }, async function (doc) {
  if (doc?.product) {
    await updateProductRating(doc.product);
  }
});

// 🔁 Fonction helper pour mettre à jour la rating du produit
async function updateProductRating(productId) {
  try {
    const Product = mongoose.model('Product');
    const Review = mongoose.model('Review');

    const stats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
      {
        $group: {
          _id: '$product',
          avg: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        'rating.average': Math.round(stats[0].avg * 10) / 10, // Arrondi à 1 décimale
        'rating.count': stats[0].count,
      });
    } else {
      // Aucun avis approuvé → réinitialiser
      await Product.findByIdAndUpdate(productId, {
        'rating.average': 0,
        'rating.count': 0,
      });
    }
  } catch (err) {
    // Ne pas bloquer l'opération principale si la mise à jour échoue
    console.error('⚠️ Failed to update product rating:', err.message);
  }
}

// ─────────────────────────────
// 🔹 EXPORT
// ─────────────────────────────
module.exports = mongoose.model('Review', reviewSchema);