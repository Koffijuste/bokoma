// src/routes/order.routes.js
// ============================================================================
// 📦 ORDER ROUTES — ORDRE CRITIQUE : spécifique avant paramétré
// ============================================================================

const router = require('express').Router();
const orderController = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const validateObjectId = require('../middlewares/validateObjectId');
const { orderRules } = require('../validators/order.validator');

// ✅ Log de vérification au démarrage
console.log('✅ [order.routes] Checking handlers...');
const handlers = [
  'createOrder', 'getMyOrders', 'getOrder', 'updateOrderStatus',
  'getAllOrders', 'getOrderStats', 'deleteOrder', 'verifyOrderPublic', 'cinetpayWebhook'
];
handlers.forEach(h => {
  const type = typeof orderController[h];
  if (type !== 'function') {
    console.error(`❌ [order.routes] ${h} is ${type} (expected function)`);
  }
});

// ============================================================================
// 🔹 1. ROUTES PUBLIQUES (AVANT protect global)
// ============================================================================

// ✅ Webhook CinetPay — SANS authentification
router.post('/webhook/cinetpay', orderController.cinetpayWebhook);

// ✅ Vérification publique de commande
router.get('/verify/:orderId', orderController.verifyOrderPublic);

// ============================================================================
// 🔹 2. MIDDLEWARE D'AUTHENTIFICATION
// ============================================================================
router.use(protect);

// ============================================================================
// 🔹 3. ROUTES PROTÉGÉES — ORDRE : spécifique avant paramétré
// ============================================================================

// ✅ Création de commande
router.post('/', orderRules, validate, orderController.createOrder);

// ✅ Mes commandes — avant /:id
router.get('/my', orderController.getMyOrders);

// ✅ Stats commandes — admin/manager — avant /:id
router.get('/stats', authorize('admin', 'manager'), orderController.getOrderStats);

// ✅ Toutes les commandes — admin/manager
router.get('/', authorize('admin', 'manager'), orderController.getAllOrders);

// ✅ Mise à jour statut — admin/manager — avant /:id générique
router.patch('/:id/status', authorize('admin', 'manager'), validateObjectId('id'), orderController.updateOrderStatus);

// ============================================================================
// 🔹 4. ROUTES AVEC PARAMÈTRES (EN DERNIER)
// ============================================================================

// ✅ Détails d'une commande
router.get('/:id', validateObjectId('id'), orderController.getOrder);

// ✅ Suppression commande — admin uniquement
router.delete('/:id', authorize('admin'), validateObjectId('id'), orderController.deleteOrder);

console.log('✅ [order.routes] All routes configured');

module.exports = router;