// src/middlewares/upload.js
// ============================================================================
// 📤 UPLOAD MIDDLEWARE — Configuration multer centralisée
// ============================================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// ============================================================================
// 🔹 CONFIGURATION DES DOSSIERS
// ============================================================================

const UPLOADS_DIR = {
  TEMP: path.join(__dirname, '../../uploads/temp'),
  AVATARS: path.join(__dirname, '../../uploads/avatars'),
  PRODUCTS: path.join(__dirname, '../../uploads/products'),
  CATEGORIES: path.join(__dirname, '../../uploads/categories'),
};

// ✅ Créer les dossiers s'ils n'existent pas
const ensureDirectories = async () => {
  for (const dir of Object.values(UPLOADS_DIR)) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error(`❌ Failed to create directory ${dir}:`, err.message);
      }
    }
  }
};

// ✅ Lancer la création au démarrage (non-bloquant)
ensureDirectories().catch(console.error);

// ============================================================================
// 🔹 HELPERS
// ============================================================================

/**
 * Nettoie les fichiers temporaires en cas d'erreur
 */
const cleanupTempFiles = async (files) => {
  if (!files || files.length === 0) return;
  
  await Promise.all(
    files.map(async (file) => {
      try {
        if (file.path) await fs.unlink(file.path);
      } catch (err) {
        console.warn('⚠️ Failed to cleanup temp file:', file.path);
      }
    })
  );
};

/**
 * Normalise les chemins Windows (backslash → slash)
 */
const normalizePath = (filePath) => {
  return filePath?.replace(/\\/g, '/') || filePath;
};

// ============================================================================
// 🔹 STOCKAGE PAR TYPE
// ============================================================================

const createStorage = (destination, prefix = 'file') => multer.diskStorage({
  destination: (req, file, cb) => cb(null, destination),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

// ============================================================================
// 🔹 FILTRES DE FICHIERS
// ============================================================================

const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 
    'image/webp', 'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(
      `Type non supporté: ${file.mimetype}. ` +
      `Types acceptés: JPEG, PNG, WEBP, GIF`
    ), false);
  }
};

// ============================================================================
// 🔹 INSTANCES MULTER PRÉ-CONFIGURÉES
// ============================================================================

// ✅ Avatar utilisateur (1 fichier, max 2MB)
const avatarUpload = multer({
  storage: createStorage(UPLOADS_DIR.AVATARS, 'avatar'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// ✅ Images produits (plusieurs fichiers, max 10MB chacun)
const productUpload = multer({
  storage: createStorage(UPLOADS_DIR.PRODUCTS, 'product'),
  fileFilter: imageFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
    fieldSize: 10 * 1024 * 1024,
  },
});

// ✅ Upload générique temporaire
const tempUpload = multer({
  storage: createStorage(UPLOADS_DIR.TEMP, 'temp'),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ============================================================================
// 🔹 MIDDLEWARES PRÉ-CONFIGURÉS (prêts à l'emploi)
// ============================================================================

/**
 * Upload d'un avatar (1 fichier, champ 'avatar')
 */
const uploadSingle = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
};

/**
 * Upload de plusieurs images produits (champ 'images', max 10)
 */
const uploadMultiple = (req, res, next) => {
  productUpload.array('images', 10)(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
};

/**
 * Upload temporaire générique (champ 'file')
 */
const uploadTemp = (req, res, next) => {
  tempUpload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
};

// ============================================================================
// 🔹 GESTIONNAIRE D'ERREURS MULTER
// ============================================================================

const handleMulterError = (err, req, res, next) => {
  // ✅ Nettoyer les fichiers temporaires en cas d'erreur
  if (req.files) {
    cleanupTempFiles(req.files).catch(console.error);
  } else if (req.file) {
    cleanupTempFiles([req.file]).catch(console.error);
  }

  if (err instanceof multer.MulterError) {
    const errorMessages = {
      LIMIT_FILE_SIZE: 'Fichier trop volumineux. Maximum autorisé dépassé.',
      LIMIT_FILE_COUNT: 'Trop de fichiers. Maximum autorisé dépassé.',
      LIMIT_UNEXPECTED_FILE: 'Champ de fichier inattendu.',
      LIMIT_FILE_TYPE: 'Type de fichier non supporté.',
      LIMIT_PART_COUNT: 'Trop de parties dans le formulaire.',
      LIMIT_FIELD_KEY: 'Nom de champ trop long.',
      LIMIT_FIELD_VALUE: 'Valeur de champ trop longue.',
      LIMIT_FIELD_COUNT: 'Trop de champs dans le formulaire.',
      LIMIT_UNEXPECTED_FILE: 'Fichier inattendu.',
    };

    const message = errorMessages[err.code] || err.message;
    
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [MulterError]', err.code, err.message);
    }

    return res.status(400).json({
      success: false,
      message,
      error: err.code,
    });
  }
  
  // ✅ Erreurs personnalisées (fileFilter)
  if (err.message) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [UploadError]', err.message);
    }
    
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  
  next(err);
};

// ============================================================================
// 🔹 EXPORTS
// ============================================================================

module.exports = {
  // ✅ Middlewares pré-configurés (prêts à l'emploi dans les routes)
  uploadSingle,      // Avatar (1 fichier)
  uploadMultiple,    // Produits (plusieurs fichiers)
  uploadTemp,        // Upload générique
  
  // ✅ Instances multer (pour usage avancé)
  avatarUpload,
  productUpload,
  tempUpload,
  
  // ✅ Gestionnaire d'erreur (à utiliser comme error middleware)
  handleMulterError,
  
  // ✅ Utilitaires
  cleanupTempFiles,
  normalizePath,
  UPLOADS_DIR,
  
  // ✅ Compatibilité : méthodes factory
  single: (fieldName = 'file') => (req, res, next) => {
    tempUpload.single(fieldName)(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  array: (fieldName = 'files', maxCount = 10) => (req, res, next) => {
    productUpload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
};