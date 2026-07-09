// src/routes/debug.routes.js
//
// 🛠  Routes de diagnostic — ADMIN ONLY (defense in depth)
// ⚠️  Kill switch global : ENABLE_DEBUG_ROUTES=false (défaut: on, y compris en prod)
//
// Trois couches de protection empilées :
//   1. debugLimiter     → anti brute-force / scan
//   2. protect          → JWT valide, charge req.user
//   3. restrictTo('admin') → refuse tout rôle ≠ admin
//
// Si l'env var de montage (server.js) est mal configurée et que la route
// se retrouve exposée par erreur, l'auth + le RBAC sauvent la mise.
const router = require('express').Router();
const ctrl = require('../controllers/debug.controller');
const { protect, restrictTo } = require('../middlewares/auth');
const { debugLimiter } = require('../middlewares/rateLimiters');

// Toutes les routes /debug/* sont admin-only.
router.use(debugLimiter, protect, restrictTo('admin'));

// GET /api/v1/debug/ip — renvoie l'IP sortante du conteneur Railway
router.get('/ip', ctrl.getOutboundIp);

module.exports = router;