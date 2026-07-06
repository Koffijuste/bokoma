// src/routes/coupon.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/coupon.controller');
const { protect, authorize } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');
const { validateCoupon } = require('../validators/coupon.validator');

// Route publique (ou protégée) pour valider un code promo
router.post('/validate', protect, ctrl.validateCoupon);

// Routes admin
router.use(protect, authorize('admin'));

router.get('/', ctrl.getCoupons);
router.post('/', validateCoupon, ctrl.createCoupon);

// ✅ VALIDATION + ObjectId
router.patch('/:id', 
  validateObjectId('id'),
  validateCoupon,
  ctrl.updateCoupon
);

router.delete('/:id', 
  validateObjectId('id'),
  ctrl.deleteCoupon
);

module.exports = router;