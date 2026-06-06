// src/routes/category.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/category.controller');
const { protect, authorize } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId'); // ← NOUVEAU

// Routes publiques
router.get('/', ctrl.getCategories);
router.get('/:slug', ctrl.getCategory); 


// Routes protégées (admin)
router.post('/', protect, authorize('admin'), ctrl.createCategory);

// ✅ VALIDATION: :id doit être un ObjectId valide
router.patch('/:id', 
  protect, 
  authorize('admin'), 
  validateObjectId('id'), 
  ctrl.updateCategory
);

router.delete('/:id', 
  protect, 
  authorize('admin'), 
  validateObjectId('id'), 
  ctrl.deleteCategory
);

module.exports = router;