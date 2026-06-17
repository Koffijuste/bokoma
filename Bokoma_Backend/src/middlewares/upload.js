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

// ============================================================================
// 🔹 INSTANCES MULTER
// ============================================================================

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

const productUpload = multer({
  storage: productStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
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

// ============================================================================
// 🔹 HELPERS
// ============================================================================

const cleanupTempFiles = async (files) => {
  if (!files || files.length === 0) return;
  
  const urls = files.map(f => f.path || f.url).filter(Boolean);
  if (urls.length > 0) {
    console.log(`🗑️ [Upload] Cleaning up ${urls.length} file(s) from Cloudinary`);
    await deleteImages(urls).catch(err => {
      console.warn('⚠️ [Upload] Cleanup failed:', err.message);
    });
  }
};

const normalizePath = (filePath) => filePath?.replace(/\\/g, '/') || filePath;

// ============================================================================
// 🔹 GESTIONNAIRE D'ERREURS
// ============================================================================

const handleMulterError = (err, req, res, next) => {
  if (req.files) cleanupTempFiles(req.files).catch(console.error);
  else if (req.file) cleanupTempFiles([req.file]).catch(console.error);

  if (err instanceof multer.MulterError) {
    const errorMessages = {
      LIMIT_FILE_SIZE: 'Fichier trop volumineux. Maximum autorisé dépassé.',
      LIMIT_FILE_COUNT: 'Trop de fichiers. Maximum autorisé dépassé.',
      LIMIT_UNEXPECTED_FILE: 'Fichier inattendu.',
      LIMIT_FILE_TYPE: 'Type de fichier non supporté.',
    };

    const message = errorMessages[err.code] || err.message;
    console.error('❌ [MulterError]', err.code, err.message);

    return res.status(400).json({
      success: false,
      message,
      error: err.code,
    });
  }
  
  if (err.message) {
    console.error('❌ [UploadError]', err.message);
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
    if (req.file) console.log('✅ [Upload] Avatar uploaded:', req.file.path);
    safeNext();
  });
};

const uploadMultiple = (req, res, next) => {
  const safeNext = createSafeNext(res, next);
  productUpload.array('images', 10)(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, safeNext);
    if (req.files && req.files.length > 0) {
      console.log(`✅ [Upload] ${req.files.length} product image(s) uploaded to Cloudinary`);
      req.files.forEach((file, i) => console.log(`   [${i + 1}] ${file.path}`));
    }
    safeNext();
  });
};

const uploadCategory = (req, res, next) => {
  const safeNext = createSafeNext(res, next);
  categoryUpload.single('image')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, safeNext);
    if (req.file) console.log('✅ [Upload] Category image uploaded:', req.file.path);
    safeNext();
  });
};

const uploadTemp = (req, res, next) => {
  const safeNext = createSafeNext(res, next);
  tempUpload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, safeNext);
    if (req.file) console.log('✅ [Upload] Temp file uploaded:', req.file.path);
    safeNext();
  });
};

// ============================================================================
// 🔹 EXPORTS
// ============================================================================

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadCategory,
  uploadTemp,
  avatarUpload,
  productUpload,
  categoryUpload,
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