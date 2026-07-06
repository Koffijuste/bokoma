// src/controllers/coupon.controller.js
const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');
const { isValidObjectId } = require('mongoose');
const { transformCouponResponse } = require('../validators/coupon.validator');

// POST /api/v1/coupons/validate (client)
exports.validateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findOne({
      code: req.body.code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() },
      startsAt: { $lte: new Date() },
    });

    if (!coupon) {
      return next(new AppError('Code promo invalide ou expiré', 404));
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return next(new AppError('Ce code a atteint sa limite d\'utilisation', 409));
    }

    if (coupon.usagePerUser && req.user?._id) {
      const userUsed = coupon.usedBy?.filter(
        (id) => id.toString() === req.user._id.toString()
      ).length || 0;
      
      if (userUsed >= coupon.usagePerUser) {
        return next(new AppError('Vous avez déjà utilisé ce code', 409));
      }
    }

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/coupons [admin]
exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt');
    
    // ✅ Transformer pour le frontend
    const transformedCoupons = coupons.map(transformCouponResponse);
    
    res.json({ 
      success: true, 
      coupons: transformedCoupons 
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/coupons [admin]
exports.createCoupon = async (req, res, next) => {
  try {
    // ✅ Vérifier si le code existe déjà
    const existing = await Coupon.findOne({ code: req.body.code });
    if (existing) {
      return next(new AppError('Ce code promo existe déjà', 409));
    }

    const coupon = await Coupon.create(req.body);
    
    res.status(201).json({ 
      success: true, 
      coupon: transformCouponResponse(coupon) 
    });
  } catch (err) {
    // ✅ Gérer les erreurs Mongoose proprement
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new AppError(messages.join(', '), 422));
    }
    if (err.code === 11000) {
      return next(new AppError('Ce code promo existe déjà', 409));
    }
    next(err);
  }
};

// PATCH /api/v1/coupons/:id [admin]
exports.updateCoupon = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('ID de coupon invalide', 400));
    }

    // ✅ Vérifier si le nouveau code existe déjà (si modifié)
    if (req.body.code) {
      const existing = await Coupon.findOne({ 
        code: req.body.code,
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return next(new AppError('Ce code promo existe déjà', 409));
      }
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!coupon) {
      return next(new AppError('Coupon introuvable', 404));
    }

    res.json({ 
      success: true, 
      coupon: transformCouponResponse(coupon) 
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new AppError(messages.join(', '), 422));
    }
    next(err);
  }
};

// DELETE /api/v1/coupons/:id [admin]
exports.deleteCoupon = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('ID de coupon invalide', 400));
    }

    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return next(new AppError('Coupon introuvable', 404));
    }

    res.json({ 
      success: true, 
      message: `Coupon "${coupon.code}" supprimé` 
    });
  } catch (err) {
    next(err);
  }
};