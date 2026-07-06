// src/middlewares/upload.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { deleteImages } = require('../services/upload.service');

// ============================================================================
// 🔹 STOCKAGE CLOUDINARY
// ============================================================================

const createCloudinaryStorage = (folder) => new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});

const avatarStorage = createCloudinaryStorage('bokoma/avatars');
const productStorage = createCloudinaryStorage('bokoma/products');
const categoryStorage = createCloudinaryStorage('bokoma/categories');
const tempStorage = createCloudinaryStorage('bokoma/temp');

// ✅ Galerie Bokoma — accepte IMAGES ET VIDÉOS
// Pour les vidéos on définit resource_type: 'video' pour que Cloudinary les
// stocke en resource_type video (sinon il essaie de les transformer en image).
const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: isVideo ? 'bokoma/gallery/videos' : 'bokoma/gallery/images',
      allowed_formats: isVideo
        ? ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v']
        : ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      resource_type: isVideo ? 'video' : 'image',
      transformation: isVideo
        ? [{ quality: 'auto' }]
        : [{ quality: 'auto' }, { fetch_format: 'auto' }],
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

// ============================================================================
// 🔹 FILTRES
// ============================================================================

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type non supporté: ${file.mimetype}. Types acceptés: JPEG, PNG, WEBP, GIF`), false);
  }
};

// ✅ Filtre média : image OU vidéo
const mediaFilter = (req, file, cb) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/x-m4v'];
  if (imageTypes.includes(file.mimetype) || videoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Type non supporté: ${file.mimetype}. Formats acceptés: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV`,
      ),
      false,
    );
  }
};

// ============================================================================
// 🔹 INSTANCES MULTER
// ============================================================================

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 30 * 1024 * 1024 },
});

const productUpload = multer({
  storage: productStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 30 * 1024 * 1024, files: 10 },
});

const categoryUpload = multer({
  storage: categoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const tempUpload = multer({
  storage: tempStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ✅ Upload galerie — images 30 MB, vidéos 100 MB
const galleryUpload = multer({
  storage: galleryStorage,
  fileFilter: mediaFilter,
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});

// ============================================================================
// 🔹 HELPERS
// ============================================================================

const cleanupTempFiles = async (files) => {
  if (!files || files.length === 0) return;

  const urls = files.map(f => f.path || f.url).filter(Boolean);
  if (urls.length > 0) {
    await deleteImages(urls).catch(() => undefined);
  }
};

const normalizePath = (filePath) => filePath?.replace(/\\/g, '/') || filePath;

// ============================================================================
// 🔹 GESTIONNAIRE D'ERREURS
// ============================================================================

const handleMulterError = (err, req, res, next) => {
  if (req.files) cleanupTempFiles(req.files).catch(() => undefined);
  else if (req.file) cleanupTempFiles([req.file]).catch(() => undefined);

  if (err instanceof multer.MulterError) {
    const errorMessages = {
      LIMIT_FILE_SIZE: 'Fichier trop volumineux. Maximum autorisé dépassé.',
      LIMIT_FILE_COUNT: 'Trop de fichiers. Maximum autorisé dépassé.',
      LIMIT_UNEXPECTED_FILE: 'Fichier inattendu.',
      LIMIT_FILE_TYPE: 'Type de fichier non supporté.',
    };

    const message = errorMessages[err.code] || err.message;

    return res.status(400).json({
      success: false,
      message,
      error: err.code,
    });
  }

  if (err.message) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
};

// ============================================================================
// 🔹 MIDDLEWARES PRÉ-CONFIGURÉS
// ============================================================================

const createSafeNext = (res, next) => {
  return typeof next === 'function'
    ? next
    : (err) => {
        if (res.headersSent) return;
        return res.status(err?.statusCode || 500).json({
          success: false,
          message: err?.message || 'Erreur lors de l\'upload',
        });
      };
};

const uploadSingle = (req, res, next) => {
  const safeNext = createSafeNext(res, next);
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, safeNext);
    safeNext();
  });
};

const uploadMultiple = (req, res, next) => {
  const safeNext = createSafeNext(res, next);
  productUpload.array('images', 10)(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, safeNext);
    safeNext();
  });
};

const uploadCategory = (req, res, next) => {
  const safeNext = createSafeNext(res, next);
  categoryUpload.single('image')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, safeNext);
    safeNext();
  });
};

const uploadTemp = (req, res, next) => {
  const safeNext = createSafeNext(res, next);
  tempUpload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, safeNext);
    safeNext();
  });
};

// ============================================================================
// 🔹 EXPORTS
// ============================================================================

// ============================================================================
// 🔹 UPLOAD GALERIE — accepte image OU vidéo (champ "file")
// ============================================================================
const uploadGallery = (req, res, next) => {
  const safeNext = createSafeNext(res, next);
  galleryUpload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, safeNext);
    safeNext();
  });
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadCategory,
  uploadTemp,
  uploadGallery,
  avatarUpload,
  productUpload,
  categoryUpload,
  galleryUpload,
  tempUpload,
  handleMulterError,
  cleanupTempFiles,
  normalizePath,
  single: (fieldName = 'file') => (req, res, next) => {
    const safeNext = createSafeNext(res, next);
    tempUpload.single(fieldName)(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, safeNext);
      safeNext();
    });
  },
  array: (fieldName = 'files', maxCount = 10) => (req, res, next) => {
    const safeNext = createSafeNext(res, next);
    productUpload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, safeNext);
      safeNext();
    });
  },
};