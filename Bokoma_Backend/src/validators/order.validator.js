const { body } = require('express-validator');

const orderRules = [
  body('items').isArray({ min: 1 }).withMessage('La commande doit contenir au moins un article'),
  body('items.*.product').isMongoId().withMessage('ID produit invalide'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantité invalide'),
  body('shipping.fullName').trim().notEmpty().withMessage('Nom de livraison requis'),
  body('shipping.phone').trim().notEmpty().withMessage('Téléphone de livraison requis'),
  body('shipping.street').trim().notEmpty().withMessage('Adresse requise'),
  body('shipping.city').trim().notEmpty().withMessage('Ville requise'),
  body('shipping.country').trim().notEmpty().withMessage('Pays requis'),
  body('payment.method')
    .isIn(['card', 'mobile_money', 'cash_on_delivery', 'bank_transfer'])
    .withMessage('Méthode de paiement invalide'),
];

module.exports = { orderRules };