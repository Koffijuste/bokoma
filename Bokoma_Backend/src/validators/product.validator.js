const { body } = require('express-validator');

const productRules = [
  body('name').trim().notEmpty().withMessage('Nom du produit requis'),
  body('description').trim().notEmpty().withMessage('Description requise'),
  body('category').isMongoId().withMessage('Catégorie invalide'),
  body('type')
    .isIn(['shoes', 'perfume', 'clothing', 'accessory'])
    .withMessage('Type invalide (shoes, perfume, clothing, accessory)'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Prix invalide'),
  body('variants').optional().custom((value, { req }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        req.body.variants = parsed;
        return Array.isArray(parsed);
      } catch (err) {
        throw new Error('Format des variantes invalide');
      }
    }
    return Array.isArray(value);
  }).withMessage('Variantes : tableau attendu'),
  body('variants.*.sku').optional().trim().notEmpty().withMessage('SKU requis pour chaque variante'),
  body('variants.*.stock').optional().isInt({ min: 0 }).withMessage('Stock invalide'),
];

const reviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Note entre 1 et 5'),
  body('title').optional().trim(),
  body('body').optional().trim(),
];

module.exports = { productRules, reviewRules };