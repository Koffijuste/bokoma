// ============================================================================
// validators/order.validator.js — VERSION OPTIMISÉE
// ============================================================================

const { body } = require('express-validator');

const orderRules = [
  // ──────────────────────────────────────────────────────────────────────────
  // 🔹 ARTICLES (items) — Optionnel : si absent, le service reconstruit depuis le panier en DB
  // ──────────────────────────────────────────────────────────────────────────
  body('items')
    .optional({ nullable: true })
    .isArray({ min: 1 })
    .withMessage('La commande doit contenir au moins un article'),

  body('items.*.product')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('ID produit invalide'),

  body('items.*.variant')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('ID variant invalide'),

  body('items.*.quantity')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Quantité invalide (min 1)'),

  body('items.*.price')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Prix invalide'),

  body('items.*.size')
    .optional().isString().trim(),

  body('items.*.color')
    .optional().isString().trim(),

  // ──────────────────────────────────────────────────────────────────────────
  // 🔹 LIVRAISON (shipping)
  // ──────────────────────────────────────────────────────────────────────────
  body('shipping').isObject().withMessage('Informations de livraison requises'),

  body('shipping.fullName')
    .trim().notEmpty()
    .withMessage('Nom de livraison requis'),

  body('shipping.phone')
    .trim().notEmpty()
    .withMessage('Téléphone de livraison requis'),

  body('shipping.street')
    .trim().notEmpty()
    .withMessage('L\'adresse (rue) est requise'),

  body('shipping.city')
    .trim().notEmpty()
    .withMessage('Ville requise'),

  body('shipping.country')
    .trim().notEmpty()
    .withMessage('Pays requis'),

  body('shipping.postalCode')
    .optional().isString().trim(),

  body('shipping.cost')
    .optional().isFloat({ min: 0 }),

  body('shipping.method')
    .optional()
    .isIn(['standard', 'express', 'pickup'])
    .withMessage('Méthode de livraison invalide'),

  // ──────────────────────────────────────────────────────────────────────────
  // 🔹 PAIEMENT (payment)
  // ──────────────────────────────────────────────────────────────────────────
  body('payment').isObject().withMessage('Informations de paiement requises'),
  
  body('payment.method')
    .isIn(['card', 'mobile_money', 'cash_on_delivery', 'bank_transfer'])
    .withMessage('Méthode de paiement invalide'),
  
  body('payment.status')
    .optional().isString(),
  
  body('payment.amountPaid')
    .optional().isFloat({ min: 0 }),

  // ──────────────────────────────────────────────────────────────────────────
  // 🔹 CHAMPS OPTIONNELS
  // ──────────────────────────────────────────────────────────────────────────
  body('notes')
    .optional().isString().trim(),
  
  body('couponCode')
    .optional().isString().trim(),
];

module.exports = { orderRules };