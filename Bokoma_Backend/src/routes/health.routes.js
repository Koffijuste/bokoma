// src/routes/health.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/health.controller');

// ✅ Route publique - pas d'authentification requise
router.get('/', ctrl.getHealth);

module.exports = router;