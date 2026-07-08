// src/controllers/gallery.controller.js
// ============================================================================
// 🛡️  POSTURE DE SÉCURITÉ — Audit 09/07/2026
// ----------------------------------------------------------------------------
// Les routes PUBLIQUES (`listPublic`, `getPublicById`) n'acceptent QUE des
// filtres de navigation (page, limit, type, category, featured). Tout autre
// paramètre (role, isAdmin, userId, isPublished, createdBy…) est IGNORÉ
// silencieusement. Le filtre `{ isPublished: true }` est imposé côté
// `findPublic` (modèle) — un attaquant ne peut pas l'outrepasser via
// query string ou body. Les champs `createdBy` (qui contient un ObjectId
// admin et son email) sont strippés de la réponse pour éviter un leak
// d'identité des administrateurs.
// ============================================================================
const GalleryItem = require('../models/GalleryItem');
const AppError = require('../utils/AppError');
const { deleteImage } = require('../services/upload.service');

// Whitelist explicite des query params acceptés sur les routes publiques
const PUBLIC_QUERY_WHITELIST = ['page', 'limit', 'type', 'category', 'featured'];

// ───────────────────────────────────────────────────────────────────────────
// 🔹 Validation helpers
// ───────────────────────────────────────────────────────────────────────────

const assertAdminOrManager = (req) => {
  if (!['admin', 'manager'].includes(req.user?.role)) {
    throw new AppError('Accès refusé. Réservé aux administrateurs.', 403);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 Helpers — extraction d'URL depuis fichier uploadé
// ───────────────────────────────────────────────────────────────────────────

const getUploadedFileUrl = (file) => {
  return file?.path || file?.secure_url || file?.url || file?.location || null;
};

const inferTypeFromMime = (mime) => {
  if (!mime) return null;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return null;
};

const inferProviderFromFile = (file) => {
  if (!file) return 'cloudinary';
  // multer-storage-cloudinary place l'URL dans file.path ; le type
  // (image vs video) est encodé dans le path (folder) ou le mimetype
  if (file.mimetype?.startsWith('video/')) return 'cloudinary';
  return 'cloudinary';
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 PUBLIC : liste paginée
// GET /api/v1/gallery
// Query params: page, limit, type, category, featured
// ───────────────────────────────────────────────────────────────────────────
exports.listPublic = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 24));

    // 🛡️ Defense-in-depth (audit 09/07/2026) : on ne fait JAMAIS confiance
    // aux query params pour décider du rôle ou du statut de publication.
    // Seuls les filtres ci-dessous sont autorisés, et la publication reste
    // imposée par le modèle (findPublic → { isPublished: true }).
    const { type, category, featured } = req.query;

    const items = await GalleryItem.findPublic({
      page,
      limit,
      type,
      category,
      featuredOnly: featured === 'true' || featured === '1',
    });

    // Filtre serveur pour le count (redondant avec findPublic mais explicite)
    const filter = { isPublished: true };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (featured === 'true' || featured === '1') filter.isFeatured = true;
    const total = await GalleryItem.countDocuments(filter);

    // 🛡️ Suppression des champs sensibles avant envoi (createdBy.email, etc.)
    const safeItems = items.map((it) => {
      if (!it) return it;
      // On retire explicitement tout ce qui ne doit pas fuiter
      delete it.createdBy;
      return it;
    });

    res.json({
      success: true,
      data: safeItems,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 PUBLIC : détail
// GET /api/v1/gallery/:id
// ───────────────────────────────────────────────────────────────────────────
exports.getPublicById = async (req, res, next) => {
  try {
    const item = await GalleryItem.findOne({
      _id: req.params.id,
      isPublished: true,
    })
      // 🛡️ On ne joint JAMAIS l'auteur pour la route publique (leak d'email admin)
      .select('-createdBy')
      .lean();

    if (!item) {
      throw new AppError('Élément introuvable ou non publié.', 404);
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : liste complète
// GET /api/v1/gallery/admin
// ───────────────────────────────────────────────────────────────────────────
exports.listAdmin = async (req, res, next) => {
  try {
    assertAdminOrManager(req);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isPublished !== undefined) {
      filter.isPublished = req.query.isPublished === 'true';
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      GalleryItem.find(filter)
        .populate('createdBy', 'firstName lastName email')
        .sort({ order: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GalleryItem.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : uploader un fichier média (image ou vidéo) sans créer l'item
// POST /api/v1/gallery/admin/upload (multipart/form-data, champ "file")
// Retourne : { success, data: { url, type, provider, publicId, width, height, duration, format } }
// ───────────────────────────────────────────────────────────────────────────
exports.uploadMedia = async (req, res, next) => {
  try {
    assertAdminOrManager(req);

    if (!req.file) {
      throw new AppError('Aucun fichier reçu. Utilisez le champ "file".', 400);
    }

    const url = getUploadedFileUrl(req.file);
    if (!url) {
      // Nettoyage si on a pu récupérer un publicId via filename
      if (req.file.filename) {
        await deleteImage(req.file.filename).catch(() => undefined);
      }
      throw new AppError("Impossible de récupérer l'URL du fichier uploadé.", 500);
    }

    const mime = req.file.mimetype || '';
    const type = inferTypeFromMime(mime);
    if (!type) {
      if (req.file.filename) {
        await deleteImage(req.file.filename).catch(() => undefined);
      }
      throw new AppError(`Type de fichier non supporté: ${mime}`, 400);
    }

    // Cloudinary renvoie width/height pour les images ; pour les vidéos on
    // s'appuie sur les metadata fournies par le storage.
    const width = req.file.width || null;
    const height = req.file.height || null;
    const duration = req.file.duration || null;

    res.status(201).json({
      success: true,
      data: {
        url,
        type,
        provider: 'cloudinary',
        publicId: req.file.filename || null,
        width,
        height,
        duration,
        format: req.file.format || null,
        bytes: req.file.bytes || req.file.size || null,
        originalName: req.file.originalname || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : créer un élément
// POST /api/v1/gallery/admin
// - multipart/form-data (champ "file" + autres champs texte) : upload direct
// - application/json                       : URL déjà hébergée (rétrocompat)
// ───────────────────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    assertAdminOrManager(req);

    // ✅ 1. Résoudre l'URL — soit via fichier uploadé, soit via le body
    let url = req.body.url;
    let provider = req.body.provider;
    let inferredType = null;

    if (req.file) {
      const uploadedUrl = getUploadedFileUrl(req.file);
      if (!uploadedUrl) {
        if (req.file.filename) {
          await deleteImage(req.file.filename).catch(() => undefined);
        }
        throw new AppError("Impossible de récupérer l'URL du fichier uploadé.", 500);
      }
      url = uploadedUrl;
      provider = 'cloudinary';
      inferredType = inferTypeFromMime(req.file.mimetype);
    }

    const {
      title,
      description,
      type,
      thumbnail,
      category,
      tags,
      product,
      isPublished,
      isFeatured,
      order,
      width,
      height,
      duration,
    } = req.body;

    if (!title) {
      if (req.file?.filename) await deleteImage(req.file.filename).catch(() => undefined);
      throw new AppError('Le titre est obligatoire.', 400);
    }
    if (!url) {
      throw new AppError("L'URL du média est obligatoire (fichier uploadé ou url fournie).", 400);
    }

    // Le type peut être inféré du fichier si pas fourni explicitement
    const finalType = type || inferredType;
    if (!finalType || !['image', 'video'].includes(finalType)) {
      if (req.file?.filename) await deleteImage(req.file.filename).catch(() => undefined);
      throw new AppError('Le type doit être "image" ou "video".', 400);
    }

    const item = await GalleryItem.create({
      title,
      description: description || '',
      type: finalType,
      url,
      thumbnail: thumbnail || '',
      provider: provider || 'cloudinary',
      category: category || 'produit',
      tags: Array.isArray(tags) ? tags : [],
      product: product || null,
      isPublished: isPublished !== undefined ? !!isPublished : true,
      isFeatured: !!isFeatured,
      order: typeof order === 'number' ? order : 0,
      width: req.file?.width || width || null,
      height: req.file?.height || height || null,
      duration: req.file?.duration || duration || null,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    // Nettoyage en cas d'erreur (sauf si l'item a été créé)
    if (req.file?.filename && !(err instanceof AppError && err.statusCode === 400 && false)) {
      // En cas d'erreur inattendue, on tente de supprimer l'upload orphelin
      await deleteImage(req.file.filename).catch(() => undefined);
    }
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : mettre à jour
// PATCH /api/v1/gallery/admin/:id
// - multipart/form-data : nouveau fichier optionnel (champ "file")
// - application/json    : on remplace juste url / metadata
// ───────────────────────────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    assertAdminOrManager(req);

    const item = await GalleryItem.findById(req.params.id);
    if (!item) {
      if (req.file?.filename) await deleteImage(req.file.filename).catch(() => undefined);
      throw new AppError('Élément introuvable.', 404);
    }

    const allowed = [
      'title', 'description', 'type', 'url', 'thumbnail', 'provider',
      'category', 'tags', 'product', 'isPublished', 'isFeatured', 'order',
      'width', 'height', 'duration',
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // ✅ Si un nouveau fichier est uploadé → on remplace url + provider + type
    let previousUrlToDelete = null;
    if (req.file) {
      const uploadedUrl = getUploadedFileUrl(req.file);
      if (!uploadedUrl) {
        if (req.file.filename) await deleteImage(req.file.filename).catch(() => undefined);
        throw new AppError("Impossible de récupérer l'URL du fichier uploadé.", 500);
      }
      previousUrlToDelete = item.url;
      update.url = uploadedUrl;
      update.provider = 'cloudinary';
      const inferredType = inferTypeFromMime(req.file.mimetype);
      if (inferredType) update.type = inferredType;
      update.width = req.file.width || item.width;
      update.height = req.file.height || item.height;
      if (req.file.duration) update.duration = req.file.duration;
    }

    const updated = await GalleryItem.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    // ✅ Supprimer l'ancien fichier Cloudinary (uniquement si nouveau upload
    //    réussi et que l'ancien URL pointe vers Cloudinary)
    if (previousUrlToDelete && previousUrlToDelete !== updated.url) {
      await deleteImage(previousUrlToDelete).catch((err) => {
        console.warn('⚠️ [Gallery] Failed to delete previous media:', err.message);
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    if (req.file?.filename) await deleteImage(req.file.filename).catch(() => undefined);
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : supprimer
// DELETE /api/v1/gallery/admin/:id
// ───────────────────────────────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    assertAdminOrManager(req);

    const item = await GalleryItem.findByIdAndDelete(req.params.id);
    if (!item) {
      throw new AppError('Élément introuvable.', 404);
    }

    // ✅ Nettoyer le média Cloudinary (image ou vidéo) en best-effort
    if (item.url && item.provider === 'cloudinary') {
      await deleteImage(item.url).catch((err) => {
        console.warn('⚠️ [Gallery] Failed to delete Cloudinary asset:', err.message);
      });
    }
    if (item.thumbnail && item.thumbnail !== item.url && item.thumbnail.includes('cloudinary')) {
      await deleteImage(item.thumbnail).catch(() => undefined);
    }

    res.json({ success: true, message: 'Élément supprimé avec succès.' });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : stats rapides
// GET /api/v1/gallery/stats
// ───────────────────────────────────────────────────────────────────────────
exports.stats = async (req, res, next) => {
  try {
    assertAdminOrManager(req);

    const [byType, total, published, featured] = await Promise.all([
      GalleryItem.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      GalleryItem.countDocuments(),
      GalleryItem.countDocuments({ isPublished: true }),
      GalleryItem.countDocuments({ isFeatured: true }),
    ]);

    const byCategory = await GalleryItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        published,
        featured,
        byType,
        byCategory,
      },
    });
  } catch (err) {
    next(err);
  }
};
