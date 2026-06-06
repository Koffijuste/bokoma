const Coupon   = require('../models/Coupon');
const AppError = require('../utils/AppError');
const { isValidObjectId } = require('mongoose');

// POST /api/v1/coupons/validate  (client)
exports.validateCoupon = async (req, res) => {
  const coupon = await Coupon.findOne({
    code:      req.body.code.toUpperCase(),
    isActive:  true,
    expiresAt: { $gt: new Date() },
    startsAt:  { $lte: new Date() },
  });
  if (!coupon) throw new AppError('Code promo invalide ou expiré', 404);

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('Ce code a atteint sa limite d\'utilisation', 409);
  }
  if (coupon.usagePerUser) {
    const userUsed = coupon.usedBy.filter(
      (id) => id.toString() === req.user._id.toString()
    ).length;
    if (userUsed >= coupon.usagePerUser) {
      throw new AppError('Vous avez déjà utilisé ce code', 409);
    }
  }

  res.json({
    success: true,
    coupon: {
      code:           coupon.code,
      type:           coupon.type,
      value:          coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount:    coupon.maxDiscount,
    },
  });
};

// ─── Admin ────────────────────────────────────────────────────────────────

// GET /api/v1/coupons  [admin]
exports.getCoupons = async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.json({ success: true, coupons });
};

// POST /api/v1/coupons  [admin]
exports.createCoupon = async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
  res.status(201).json({ success: true, coupon });
};

// PATCH /api/v1/coupons/:id  [admin]
exports.updateCoupon = async (req, res) => {
  // ✅ Valider coupon id
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('ID de coupon invalide', 400);
  }

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { 
    returnDocument: 'after', 
    runValidators: true 
  });
  if (!coupon) throw new AppError('Coupon introuvable', 404);
  res.json({ success: true, coupon });
};

// DELETE /api/v1/coupons/:id  [admin]
exports.deleteCoupon = async (req, res) => {
  // ✅ Valider coupon id
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('ID de coupon invalide', 400);
  }

  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new AppError('Coupon introuvable', 404);
  res.json({ success: true, message: 'Coupon supprimé' });
};