// src/routes/coupon.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/coupon.controller');
const { protect, authorize } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId'); // ← NOUVEAU

// Route publique (ou protégée) pour valider un code promo
router.post('/validate', protect, ctrl.validateCoupon);

// Routes admin
router.use(protect, authorize('admin'));

router.get('/', ctrl.getCoupons);
router.post('/', ctrl.createCoupon);

// ✅ VALIDATION: :id doit être un ObjectId valide
router.patch('/:id', 
  validateObjectId('id'), // ← Middleware validation
  ctrl.updateCoupon
);

router.delete('/:id', 
  validateObjectId('id'), // ← Middleware validation
  ctrl.deleteCoupon
);

module.exports = router;