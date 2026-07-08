// src/routes/debug.routes.js
//
// ⚠️  Routes de diagnostic — contrôlées par ENABLE_DEBUG_ROUTES (défaut: on en prod)
const router = require('express').Router();
const ctrl = require('../controllers/debug.controller');

// GET /api/v1/debug/ip — renvoie l'IP sortante du conteneur Railway
router.get('/ip', ctrl.getOutboundIp);

module.exports = router;