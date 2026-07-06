// src/routes/order.routes.js
// ============================================================================
// 📦 ORDER ROUTES
// RÈGLE D'OR : routes spécifiques AVANT routes paramétrées (/:id)
// ⚠️ Le webhook CinetPay est dans src/routes/webhook.routes.js (signature vérifiée)
// ============================================================================

const router = require('express').Router();
const ctrl = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const validateObjectId = require('../middlewares/validateObjectId');
const { orderRules } = require('../validators/order.validator');

// ============================================================================
// 🔹 1. PUBLIQUES — Aucune authentification requise
// ============================================================================

// Vérification publique après paiement (page /payment/success)
router.get('/verify/:orderId', ctrl.verifyOrderPublic);

// ============================================================================
// 🔹 2. Appliquer protect à TOUTES les routes suivantes
// ============================================================================
router.use(protect);

// ============================================================================
// 🔹 3. SPÉCIFIQUES — Avant /:id (sinon Express interprète /my, /stats comme des IDs)
// ============================================================================

// GET /my — Mes commandes (client)
router.get('/my', ctrl.getMyOrders);

// GET /stats — Statistiques (admin/manager)
router.get('/stats', authorize('admin', 'manager'), ctrl.getOrderStats);

// GET / — Toutes les commandes (admin/manager)
router.get('/', authorize('admin', 'manager'), ctrl.getAllOrders);

// POST / — Créer une commande ← PAS de authorize ici, customer autorisé
router.post('/', orderRules, validate, ctrl.createOrder);

// ============================================================================
// 🔹 4. PARAMÉTRÉES — Après les routes spécifiques
// ============================================================================

// PATCH /:id/status — Mettre à jour statut (admin/manager)
router.patch('/:id/status', authorize('admin', 'manager'), validateObjectId('id'), ctrl.updateOrderStatus);

// PATCH /:id/cancel — Annuler ma commande (ownership vérifié dans le service)
router.patch('/:id/cancel', validateObjectId('id'), ctrl.cancelOrder);

// PATCH /:id/delivered — Confirmer réception (client)
router.patch('/:id/delivered', validateObjectId('id'), ctrl.markAsDelivered);

// PATCH /:id/archive — Archiver (client)
router.patch('/:id/archive', validateObjectId('id'), ctrl.archiveOrder);

// GET /:id — Détails commande (ownership vérifié dans le contrôleur)
router.get('/:id', validateObjectId('id'), ctrl.getOrder);

// DELETE /:id — Supprimer (admin uniquement)
router.delete('/:id', authorize('admin'), validateObjectId('id'), ctrl.deleteOrder);

module.exports = router;