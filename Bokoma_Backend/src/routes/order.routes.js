// src/routes/order.routes.js
// ============================================================================
// 📦 ORDER ROUTES — ORDRE CRITIQUE : spécifique avant paramétré
// ============================================================================

const express = require('express');
const router = express.Router();

const validateObjectId = require('../middlewares/validateObjectId');
const orderController = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { orderRules } = require('../validators/order.validator');

// ============================================================================
// 🔹 1. ROUTES PUBLIQUES (AVANT protect global)
// ============================================================================

// ✅ Vérification publique de commande — SANS authentification
router.get('/verify/:orderId', orderController.verifyOrderPublic);

// ============================================================================
// 🔹 2. MIDDLEWARE D'AUTHENTIFICATION (pour les routes suivantes uniquement)
// ============================================================================
router.use(protect);

// ============================================================================
// 🔹 3. ROUTES PROTÉGÉES — ORDRE : spécifique avant paramétré
// ============================================================================

// ✅ Création de commande (POST /)
router.post('/', orderRules, validate, orderController.createOrder);

// ✅ Mes commandes (GET /my) — avant /:id pour éviter conflit
router.get('/my', protect, orderController.getMyOrders);

// ✅ Stats commandes — admin/manager uniquement — avant /:id
router.get('/stats', authorize('admin', 'manager'), orderController.getOrderStats);

// ✅ Toutes les commandes — admin/manager uniquement
router.get('/', authorize('admin', 'manager'), orderController.getAllOrders);

// ✅ Mise à jour statut — admin/manager — avant /:id générique
router.patch('/:id/status', authorize('admin', 'manager'), validateObjectId('id'), orderController.updateOrderStatus);

// ============================================================================
// 🔹 4. ROUTES AVEC PARAMÈTRES (EN DERNIER)
// ============================================================================

// ✅ Détails d'une commande — utilisateur authentifié (propriétaire ou admin)
router.get('/:id', validateObjectId('id'), orderController.getOrder);

// ============================================================================
// 🔹 EXPORT
// ============================================================================
module.exports = router;