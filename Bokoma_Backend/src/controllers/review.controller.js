// src/controllers/review.controller.js
const Review = require('../models/Review');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { isValidObjectId } = require('mongoose'); // ← NOUVEAU

// GET /api/v1/products/:productId/reviews
exports.getProductReviews = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  // ✅ Valider productId
  if (!isValidObjectId(req.params.productId)) {
    throw new AppError('ID de produit invalide', 400);
  }

  const reviews = await Review.find({ 
    product: req.params.productId, 
    isApproved: true 
  })
    .populate('user', 'firstName lastName avatar')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Review.countDocuments({ 
    product: req.params.productId, 
    isApproved: true 
  });
  
  res.json({ success: true, total, page, reviews });
};

// POST /api/v1/products/:productId/reviews
exports.createReview = async (req, res) => {
  // ✅ Valider productId (déjà fait par middleware, mais double sécurité)
  if (!isValidObjectId(req.params.productId)) {
    throw new AppError('ID de produit invalide', 400);
  }

  const productId = req.params.productId;

  // Vérifier si déjà reviewé
  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) throw new AppError('Vous avez déjà laissé un avis sur ce produit', 409);

  // Vérifier achat
  const order = await Order.findOne({
    user: req.user._id,
    status: 'delivered',
    'items.product': productId,
  });

  const images = req.files?.map((f) => f.path) || [];

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    order: order?._id,
    isVerifiedPurchase: !!order,
    images,
    ...req.body,
  });

  res.status(201).json({ success: true, review });
};

// DELETE /api/v1/reviews/:id [admin ou auteur]
exports.deleteReview = async (req, res) => {
  // ✅ Valider review id
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('ID d\'avis invalide', 400);
  }

  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Avis introuvable', 404);
  
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Accès refusé', 403);
  }
  
  await review.deleteOne();
  res.json({ success: true, message: 'Avis supprimé' });
};

// PATCH /api/v1/reviews/:id/approve [admin]
exports.approveReview = async (req, res) => {
  // ✅ Valider review id
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('ID d\'avis invalide', 400);
  }

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true }
  );
  if (!review) throw new AppError('Avis introuvable', 404);
  res.json({ success: true, review });
};

// POST /api/v1/reviews/:id/helpful
exports.markHelpful = async (req, res) => {
  // ✅ Valider review id
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('ID d\'avis invalide', 400);
  }

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpfulCount: 1 } },
    { new: true }
  );
  if (!review) throw new AppError('Avis introuvable', 404);
  res.json({ success: true, helpfulCount: review.helpfulCount });
};