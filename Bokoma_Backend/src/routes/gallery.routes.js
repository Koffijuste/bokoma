// src/routes/gallery.routes.js
const router = require('express').Router();
const { protect, authorize } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');
const { uploadGallery } = require('../middlewares/upload');
const galleryController = require('../controllers/gallery.controller');

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ROUTES PUBLIQUES — pas d'auth
// ───────────────────────────────────────────────────────────────────────────

// Liste publique paginée des médias (galerie vitrine)
router.get('/', galleryController.listPublic);

// Détail d'un média publié
router.get('/:id', validateObjectId('id'), galleryController.getPublicById);

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ROUTES ADMIN — protégées
// ───────────────────────────────────────────────────────────────────────────

router.get('/admin/list', protect, authorize('admin', 'manager'), galleryController.listAdmin);
router.get('/admin/stats', protect, authorize('admin', 'manager'), galleryController.stats);

// ✅ Upload seul (image ou vidéo) — renvoie l'URL Cloudinary
router.post(
  '/admin/upload',
  protect,
  authorize('admin', 'manager'),
  uploadGallery,
  galleryController.uploadMedia,
);

// ✅ Création avec upload optionnel (multipart/form-data) OU JSON avec URL
router.post(
  '/admin',
  protect,
  authorize('admin', 'manager'),
  uploadGallery,
  galleryController.create,
);

router.patch(
  '/admin/:id',
  protect,
  authorize('admin', 'manager'),
  uploadGallery,
  validateObjectId('id'),
  galleryController.update,
);

router.delete(
  '/admin/:id',
  protect,
  authorize('admin', 'manager'),
  validateObjectId('id'),
  galleryController.remove,
);

module.exports = router;
