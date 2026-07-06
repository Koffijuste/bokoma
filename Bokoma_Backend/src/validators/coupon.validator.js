// src/validators/coupon.validator.js
const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// ✅ Middleware de validation + transformation des champs
const validateCoupon = [
  body('code')
    .trim()
    .notEmpty().withMessage('Le code est requis')
    .isLength({ min: 3, max: 20 }).withMessage('Le code doit faire entre 3 et 20 caractères')
    .isAlphanumeric().withMessage('Le code ne doit contenir que des lettres et chiffres'),
  
  body('discountType')
    .isIn(['percentage', 'fixed']).withMessage('Type de réduction invalide'),
  
  body('discountValue')
    .notEmpty().withMessage('La valeur est requise')
    .isFloat({ min: 0 }).withMessage('La valeur doit être positive')
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && value > 100) {
        throw new Error('Le pourcentage ne peut pas dépasser 100%');
      }
      return true;
    }),
  
  body('minPurchase')
    .optional()
    .isFloat({ min: 0 }).withMessage('L\'achat minimum doit être positif'),
  
  body('maxUsage')
    .optional()
    .isInt({ min: 1 }).withMessage('L\'utilisation max doit être ≥ 1'),
  
  body('validFrom')
    .notEmpty().withMessage('La date de début est requise')
    .isISO8601().withMessage('Date de début invalide'),
  
  body('validUntil')
    .notEmpty().withMessage('La date de fin est requise')
    .isISO8601().withMessage('Date de fin invalide')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error('La date de fin doit être après la date de début');
      }
      if (new Date(value) < new Date()) {
        throw new Error('La date de fin doit être dans le futur');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('Description trop longue (max 200 caractères)'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive doit être un booléen'),

  // ✅ Middleware de transformation
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array().map(e => ({
          field: e.path,
          message: e.msg,
        })),
      });
    }

    // ✅ TRANSFORMATION : Frontend → Backend
    req.body = {
      code: req.body.code.toUpperCase().trim(),
      type: req.body.discountType,           // discountType → type
      value: parseFloat(req.body.discountValue), // discountValue → value
      minOrderAmount: req.body.minPurchase ? parseFloat(req.body.minPurchase) : 0, // minPurchase → minOrderAmount
      usageLimit: req.body.maxUsage ? parseInt(req.body.maxUsage) : null, // maxUsage → usageLimit
      startsAt: new Date(req.body.validFrom), // validFrom → startsAt
      expiresAt: new Date(req.body.validUntil), // validUntil → expiresAt
      description: req.body.description?.trim() || '',
      isActive: req.body.isActive !== false,
    };

    next();
  },
];

// ✅ Middleware pour transformer la réponse backend → frontend
const transformCouponResponse = (coupon) => {
  if (!coupon) return null;
  
  return {
    _id: coupon._id,
    code: coupon.code,
    discountType: coupon.type,              // type → discountType
    discountValue: coupon.value,            // value → discountValue
    minPurchase: coupon.minOrderAmount,     // minOrderAmount → minPurchase
    maxUsage: coupon.usageLimit,            // usageLimit → maxUsage
    currentUsage: coupon.usedCount || 0,    // usedCount → currentUsage
    validFrom: coupon.startsAt,             // startsAt → validFrom
    validUntil: coupon.expiresAt,           // expiresAt → validUntil
    description: coupon.description,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
};

module.exports = { validateCoupon, transformCouponResponse };