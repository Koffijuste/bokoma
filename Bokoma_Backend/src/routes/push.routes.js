// src/routes/push.routes.js
// ============================================================================
// 🔔 PUSH ROUTES — gestion des abonnements Web Push (PWA)
// ============================================================================

const express = require('express');
const router = express.Router();
const pushController = require('../controllers/push.controller');
const { protect, restrictTo } = require('../middlewares/auth');

// ── Public : clé publique VAPID (le frontend en a besoin pour subscribe) ─
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// ── Auth requise : enregistrement / suppression d'un abonnement ──────────
router.post('/subscribe',   protect, pushController.subscribe);
router.delete('/subscribe', protect, pushController.unsubscribe);

// ── Admin only : envoyer une notif de test à un user (debug prod) ────────
router.post('/test', protect, restrictTo('admin', 'manager'), pushController.sendTest);

module.exports = router;
