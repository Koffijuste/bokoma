// bokoma_backend/src/routes/review.routes.js
const router = require('express').Router();
const reviewController = require('../controllers/review.controller');
const { protect, authorize } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');
const { uploadMultiple } = require('../middlewares/upload');

// ============================================================================
// 🔹 ROUTES ADMIN (liste globale + stats)
// ============================================================================

// ✅ NOUVEAU : Liste tous les avis (admin)
router.get('/', protect, authorize('admin', 'manager'), reviewController.getAllReviews);

// ✅ NOUVEAU : Statistiques des avis (admin)
router.get('/stats', protect, authorize('admin', 'manager'), reviewController.getReviewStats);

// ============================================================================
// 🔹 ROUTES PROTÉGÉES (utilisateur authentifié)
// ============================================================================

router.use(protect);

// Approuver un avis (admin)
router.patch('/:id/approve', authorize('admin', 'manager'), validateObjectId('id'), reviewController.approveReview);

// Rejeter un avis (admin)
router.patch('/:id/reject', authorize('admin', 'manager'), validateObjectId('id'), reviewController.rejectReview);

// Supprimer un avis
router.delete('/:id', validateObjectId('id'), reviewController.deleteReview);

// Marquer comme utile
router.post('/:id/helpful', validateObjectId('id'), reviewController.markHelpful);

// ============================================================================
// 🔹 ROUTES PRODUIT (avis liés à un produit)
// ============================================================================

// Lister les avis d'un produit (public, seulement approuvés)
router.get('/product/:productId', validateObjectId('productId'), reviewController.getProductReviews);

// Créer un avis sur un produit
router.post('/product/:productId', 
  validateObjectId('productId'), 
  uploadMultiple, 
  reviewController.createReview
);

module.exports = router;