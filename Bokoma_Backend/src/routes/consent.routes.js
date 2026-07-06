// src/routes/consent.routes.js
const router = require('express').Router();
const { protect, authorize } = require('../middlewares/auth');
const consentController = require('../controllers/consent.controller');

// ✅ PUBLIC : loguer un consentement (utilisable par visiteurs anonymes)
router.post('/', consentController.logConsent);

// 🔒 ADMIN : consulter les logs + stats
router.get('/admin/logs', protect, authorize('admin', 'manager'), consentController.listLogs);
router.get('/admin/stats', protect, authorize('admin', 'manager'), consentController.stats);

module.exports = router;