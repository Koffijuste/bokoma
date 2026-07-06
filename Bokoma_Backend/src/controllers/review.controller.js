// bokoma_backend/src/controllers/review.controller.js
const Review = require('../models/Review');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { isValidObjectId } = require('mongoose');

// ============================================================================
// 🔹 GET /api/v1/reviews — Liste TOUS les avis (admin)
// ============================================================================
exports.getAllReviews = async (req, res, next) => {
  try {
    // ✅ Vérifier permissions admin
    if (!['admin', 'manager'].includes(req.user?.role)) {
      return next(new AppError('Accès réservé aux administrateurs', 403));
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // ✅ Construction des filtres
    const filters = {};

    // Filtre par statut d'approbation
    if (req.query.approved !== undefined) {
      filters.isApproved = req.query.approved === 'true';
    }

    // Filtre par produit
    if (req.query.productId && isValidObjectId(req.query.productId)) {
      filters.product = req.query.productId;
    }

    // Filtre par utilisateur
    if (req.query.userId && isValidObjectId(req.query.userId)) {
      filters.user = req.query.userId;
    }

    // Filtre par note minimum
    if (req.query.minRating) {
      filters.rating = { $gte: parseInt(req.query.minRating) };
    }

    // Filtre par note maximum
    if (req.query.maxRating) {
      filters.rating = { ...filters.rating, $lte: parseInt(req.query.maxRating) };
    }

    // ✅ Tri
    const validSortFields = ['createdAt', 'rating', 'isHelpful', 'updatedAt'];
    const sortField = validSortFields.includes(req.query.sortBy) 
      ? req.query.sortBy 
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // ✅ Requête avec populate — limit drastique des champs pour alléger le payload
    const [reviews, total] = await Promise.all([
      Review.find(filters)
        .populate({
          path: 'product',
          select: 'name slug images',
        })
        .populate('user', 'firstName lastName email avatar')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filters),
    ]);

    // ✅ Tronque le body à 240 chars pour le listing admin (économise ~70% du payload)
    const lightweight = reviews.map((r) => ({
      ...r,
      bodyFull: r.body,
      body: r.body?.length > 240 ? `${r.body.slice(0, 240).trimEnd()}…` : r.body,
      // Limite aussi la 1re image du produit à 1 pour éviter les tableaux longs
      product: r.product
        ? { ...r.product, images: Array.isArray(r.product.images) ? r.product.images.slice(0, 1) : r.product.images }
        : r.product,
    }));

    console.log(`✅ [Reviews] ${lightweight.length} avis chargés (total: ${total})`);

    res.json({
      success: true,
      data: {
        reviews: lightweight,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('❌ [Reviews] getAllReviews error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 GET /api/v1/reviews/stats — Statistiques des avis (admin)
// ============================================================================
exports.getReviewStats = async (req, res, next) => {
  try {
    if (!['admin', 'manager'].includes(req.user?.role)) {
      return next(new AppError('Accès réservé aux administrateurs', 403));
    }

    const productId = req.query.productId;
    const matchFilter = {};

    if (productId && isValidObjectId(productId)) {
      matchFilter.product = productId;
    }

    // ✅ Agrégations en parallèle
    const [
      totalResult,
      ratingDistribution,
      approvedCount,
      pendingCount,
      averageResult,
    ] = await Promise.all([
      // Total
      Review.countDocuments(matchFilter),
      
      // Distribution par note
      Review.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      
      // Approuvés
      Review.countDocuments({ ...matchFilter, isApproved: true }),
      
      // En attente
      Review.countDocuments({ ...matchFilter, isApproved: false }),
      
      // Note moyenne
      Review.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
    ]);

    // ✅ Construire la distribution (1 à 5 étoiles)
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });

    const stats = {
      totalReviews: totalResult,
      approvedCount,
      pendingCount,
      averageRating: averageResult[0]?.avg || 0,
      ratingDistribution: distribution,
    };

    console.log('📊 [Reviews] Stats:', stats);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('❌ [Reviews] getReviewStats error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 GET /api/v1/products/:productId/reviews — Avis d'un produit
// ============================================================================
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return next(new AppError('ID de produit invalide', 400));
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filters = { product: productId, isApproved: true };

    const sortField = ['createdAt', 'rating', 'isHelpful'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [reviews, total] = await Promise.all([
      Review.find(filters)
        .populate('user', 'firstName lastName avatar')
        .sort({ [sortField]: sortOrder, isHelpful: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filters),
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('❌ [Reviews] getProductReviews error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 POST /api/v1/products/:productId/reviews — Créer un avis
// ============================================================================
exports.createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user?._id || req.user?.userId;

    if (!isValidObjectId(productId)) {
      return next(new AppError('ID de produit invalide', 400));
    }

    if (!userId) {
      return next(new AppError('Utilisateur non authentifié', 401));
    }

    // ✅ Vérifier que le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError('Produit introuvable', 404));
    }

    // ✅ Vérifier que l'utilisateur n'a pas déjà laissé un avis
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      return next(new AppError('Vous avez déjà laissé un avis pour ce produit', 409));
    }

    const { rating, title, body } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return next(new AppError('Note invalide (entre 1 et 5)', 400));
    }

    if (!body || body.trim().length < 10) {
      return next(new AppError('Le commentaire doit contenir au moins 10 caractères', 400));
    }

    // ✅ Gestion des images
    const images = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        images.push({
          url: file.path || file.url,
          publicId: file.filename,
        });
      });
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      title: title?.trim(),
      body: body.trim(),
      images,
      isApproved: false, // En attente de modération
    });

    await review.populate('user', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Avis créé avec succès, en attente de modération',
      data: { review },
    });
  } catch (err) {
    console.error('❌ [Reviews] createReview error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 PATCH /api/v1/reviews/:id/approve — Approuver un avis (admin)
// ============================================================================
exports.approveReview = async (req, res, next) => {
  try {
    if (!['admin', 'manager'].includes(req.user?.role)) {
      return next(new AppError('Accès réservé aux administrateurs', 403));
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return next(new AppError('ID d\'avis invalide', 400));
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true }
    );

    if (!review) {
      return next(new AppError('Avis introuvable', 404));
    }

    console.log(`✅ [Reviews] Avis ${id} approuvé`);

    res.json({
      success: true,
      message: 'Avis approuvé',
      data: { review },
    });
  } catch (err) {
    console.error('❌ [Reviews] approveReview error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 PATCH /api/v1/reviews/:id/reject — Rejeter un avis (admin)
// ============================================================================
exports.rejectReview = async (req, res, next) => {
  try {
    if (!['admin', 'manager'].includes(req.user?.role)) {
      return next(new AppError('Accès réservé aux administrateurs', 403));
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return next(new AppError('ID d\'avis invalide', 400));
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { isApproved: false },
      { new: true }
    );

    if (!review) {
      return next(new AppError('Avis introuvable', 404));
    }

    console.log(`✅ [Reviews] Avis ${id} rejeté`);

    res.json({
      success: true,
      message: 'Avis rejeté',
      data: { review },
    });
  } catch (err) {
    console.error('❌ [Reviews] rejectReview error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 DELETE /api/v1/reviews/:id — Supprimer un avis
// ============================================================================
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.userId;
    const userRole = req.user?.role;

    if (!isValidObjectId(id)) {
      return next(new AppError('ID d\'avis invalide', 400));
    }

    const review = await Review.findById(id);
    if (!review) {
      return next(new AppError('Avis introuvable', 404));
    }

    // ✅ Vérifier les permissions (admin ou auteur)
    const isOwner = review.user.toString() === userId.toString();
    const isAdmin = ['admin', 'manager'].includes(userRole);

    if (!isOwner && !isAdmin) {
      return next(new AppError('Accès refusé', 403));
    }

    await Review.findByIdAndDelete(id);

    console.log(`🗑️ [Reviews] Avis ${id} supprimé`);

    res.json({
      success: true,
      message: 'Avis supprimé',
    });
  } catch (err) {
    console.error('❌ [Reviews] deleteReview error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 POST /api/v1/reviews/:id/helpful — Marquer comme utile
// ============================================================================
exports.markHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return next(new AppError('ID d\'avis invalide', 400));
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { $inc: { isHelpful: 1 } },
      { new: true }
    );

    if (!review) {
      return next(new AppError('Avis introuvable', 404));
    }

    res.json({
      success: true,
      data: { review },
    });
  } catch (err) {
    console.error('❌ [Reviews] markHelpful error:', err);
    next(err);
  }
};