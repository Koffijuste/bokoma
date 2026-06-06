// bokoma_backend/src/routes/cart.routes.js
// ============================================================================
// 🛒 CART ROUTES - Routes du panier (guest + authentifié)
// ============================================================================

const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const { protect } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');

// ============================================================================
// 🔹 ROUTES PUBLIQUES (guest via x-session-id ou user authentifié)
// ============================================================================

// GET /api/v1/cart — Voir son panier
router.get('/', cartController.getCart);

// POST /api/v1/cart/items — Ajouter un produit
router.post('/items', cartController.addItem);

// ============================================================================
// 🔹 ROUTES AVEC VALIDATION D'ID (itemId = ObjectId de sous-document)
// ============================================================================

// PATCH /api/v1/cart/items/:itemId — Mettre à jour quantité
router.patch(
  '/items/:itemId',
  validateObjectId('itemId'),
  cartController.updateItem
);

// DELETE /api/v1/cart/items/:itemId — Supprimer un article
router.delete(
  '/items/:itemId',
  validateObjectId('itemId'),
  cartController.removeItem
);

// ============================================================================
// 🔹 ROUTES DE GESTION DU PANIER
// ============================================================================

// DELETE /api/v1/cart — Vider le panier
router.delete('/', cartController.clearCart);

// POST /api/v1/cart/coupon — Appliquer un code promo
router.post('/coupon', cartController.applyCoupon);

// DELETE /api/v1/cart/coupon — Retirer un code promo
router.delete('/coupon', cartController.removeCoupon);

// ============================================================================
// 🔹 EXPORT
// ============================================================================
module.exports = router;