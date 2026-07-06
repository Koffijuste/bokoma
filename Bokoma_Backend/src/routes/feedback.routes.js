// src/routes/feedback.routes.js
const router = require('express').Router();
const { protect, authorize } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');
const feedbackController = require('../controllers/feedback.controller');

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ROUTES PUBLIQUES
// ───────────────────────────────────────────────────────────────────────────

// Catégories disponibles (utile au front)
router.get('/categories', feedbackController.listCategories);

// Liste publique des feedbacks approuvés
router.get('/', feedbackController.listPublic);

// Soumettre un feedback (public, auth optionnelle)
router.post('/', feedbackController.create);

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ROUTES ADMIN — protégées
// ───────────────────────────────────────────────────────────────────────────

router.use('/admin', protect, authorize('admin', 'manager'));

router.get('/admin/list',        feedbackController.listAdmin);
router.get('/admin/stats',       feedbackController.stats);
router.get('/admin/:id',         validateObjectId('id'), feedbackController.getById);
router.patch('/admin/:id/status', validateObjectId('id'), feedbackController.updateStatus);
router.delete('/admin/:id',      validateObjectId('id'), feedbackController.remove);

module.exports = router;
