// src/routes/review.routes.js
const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/review.controller');
const { protect, authorize } = require('../middlewares/auth');
const { uploadMultiple } = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const { reviewRules } = require('../validators/product.validator');
const validateObjectId = require('../middlewares/validateObjectId'); // ← NOUVEAU

// GET /api/v1/products/:productId/reviews
router.get('/', ctrl.getProductReviews);

// POST /api/v1/products/:productId/reviews
router.post('/', 
  protect, 
  uploadMultiple, 
  reviewRules, 
  validate, 
  validateObjectId('productId'), // ← Validation du Product ID
  ctrl.createReview
);

// Routes directes /api/v1/reviews/:id
router.delete('/:id', 
  protect, 
  validateObjectId('id'), // ← Validation du Review ID
  ctrl.deleteReview
);

router.patch('/:id/approve', 
  protect, 
  authorize('admin'), 
  validateObjectId('id'), // ← Validation du Review ID
  ctrl.approveReview
);

router.post('/:id/helpful', 
  protect, 
  validateObjectId('id'), // ← Validation du Review ID
  ctrl.markHelpful
);

module.exports = router;