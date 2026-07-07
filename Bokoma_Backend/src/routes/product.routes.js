// src/routes/product.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const reviewController = require('../controllers/review.controller');
const { protect, authorize } = require('../middlewares/auth');
const { uploadMultiple } = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const { productRules } = require('../validators/product.validator');
const validateObjectId = require('../middlewares/validateObjectId');

// ✅ Routes publiques
router.get('/', ctrl.getProducts);
router.get('/featured', ctrl.getFeaturedProducts);
router.get('/:slug', ctrl.getProduct);

// ============================================================================
// 🔹 AVIS PRODUIT — nested routes (RESTful /products/:id/reviews)
// ============================================================================
// Pourquoi ici plutôt que dans review.routes.js :
//   1. Le frontend appelle /products/:id/reviews (cf. services/api.ts reviewApi).
//   2. Le controller review.controller.js est déjà écrit pour ce path
//      (cf. commentaire ligne 176 et 226 du controller).
//   3. Le router review.routes.js expose l'ancien path /reviews/product/:id
//      → conservé en alias rétro-compat ci-dessous.
// ============================================================================

// 📖 Lister les avis approuvés d'un produit (public)
// ⚠️ Le paramètre DOIT s'appeler :productId (le controller lit req.params.productId)
router.get(
  '/:productId/reviews',
  validateObjectId('productId'),
  reviewController.getProductReviews,
);

// ✍️  Créer un avis sur un produit (utilisateur authentifié)
router.post(
  '/:productId/reviews',
  protect,
  uploadMultiple,
  validateObjectId('productId'),
  reviewController.createReview,
);

// ✅ Routes protégées admin/manager
router.post('/', 
  protect, 
  authorize('admin', 'manager'), 
  uploadMultiple, 
  productRules, 
  validate, 
  ctrl.createProduct
);

// ✅ Mise à jour d'un produit (PUT)
router.put('/:id', 
  protect, 
  authorize('admin', 'manager'),
  uploadMultiple,
  validateObjectId('id'),
  ctrl.updateProduct
);

// ✅ Mise à jour partielle (PATCH)
router.patch('/:id', 
  protect, 
  authorize('admin', 'manager'), 
  uploadMultiple, 
  validateObjectId('id'),
  ctrl.updateProduct
);

router.delete('/:id', 
  protect, 
  authorize('admin'), 
  validateObjectId('id'), 
  ctrl.deleteProduct
);

router.delete('/:id/images/:imageIndex', 
  protect, 
  authorize('admin', 'manager'), 
  validateObjectId('id'), 
  ctrl.deleteProductImage
);

// ✅ Variantes
router.post('/:id/variants', 
  protect, 
  authorize('admin', 'manager'), 
  validateObjectId('id'), 
  ctrl.addVariant
);

router.patch('/:id/variants/:variantId', 
  protect, 
  authorize('admin', 'manager'), 
  validateObjectId('id'), 
  validateObjectId('variantId'), 
  ctrl.updateVariant
);

router.delete('/:id/variants/:variantId', 
  protect, 
  authorize('admin', 'manager'), 
  validateObjectId('id'), 
  validateObjectId('variantId'), 
  ctrl.deleteVariant
);

module.exports = router;