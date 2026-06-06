// src/routes/product.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const { protect, authorize } = require('../middlewares/auth');
const { uploadMultiple } = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const { productRules } = require('../validators/product.validator');
const validateObjectId = require('../middlewares/validateObjectId');

// ✅ Routes publiques
router.get('/', ctrl.getProducts);
router.get('/featured', ctrl.getFeaturedProducts);
router.get('/:slug', ctrl.getProduct); // ← :slug = string, pas de validation ObjectId

// ✅ Routes protégées admin/manager
router.post('/', 
  protect, 
  authorize('admin', 'manager'), 
  uploadMultiple, 
  productRules, 
  validate, 
  ctrl.createProduct
);

router.patch('/:id', 
  protect, 
  authorize('admin', 'manager'), 
  uploadMultiple, 
  validateObjectId('id'), // ← Validation ObjectId
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