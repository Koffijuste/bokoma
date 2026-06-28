// src/routes/order.routes.js
// ============================================================================
// 📦 ORDER ROUTES
// RÈGLE D'OR : routes spécifiques AVANT routes paramétrées (/:id)
// ============================================================================

const router = require('express').Router();
const ctrl   = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth');
const validate         = require('../middlewares/validate');
const validateObjectId = require('../middlewares/validateObjectId');
const { orderRules }   = require('../validators/order.validator');
const orderController = require('../controllers/order.controller');
// ============================================================================
// 🔹 1. PUBLIQUES — Aucune authentification requise
// ============================================================================

// Webhook CinetPay (appelé par le serveur CinetPay, pas par le client)
router.post('/webhook/cinetpay', ctrl.cinetpayWebhook);

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
// ⚠️ Doit être avant GET /:id
router.patch('/:id/status', authorize('admin', 'manager'), validateObjectId('id'), ctrl.updateOrderStatus);

// PATCH /:id/cancel — Annuler ma commande (client, ownership vérifié dans le ctrl)
router.patch('/:id/cancel', validateObjectId('id'), ctrl.cancelOrder);

// GET /:id — Détails commande (ownership vérifié dans le ctrl)
router.get('/:id', validateObjectId('id'), ctrl.getOrder);

// DELETE /:id — Supprimer (admin uniquement)
router.delete('/:id', authorize('admin'), validateObjectId('id'), ctrl.deleteOrder);

// ✅ Confirmer réception (client)
router.patch('/:id/delivered', protect, validateObjectId('id'), orderController.markAsDelivered);

// Dans la section "ROUTES CLIENT", ajouter :
router.patch('/:id/archive', validateObjectId('id'), ctrl.archiveOrder);

module.exports = router;