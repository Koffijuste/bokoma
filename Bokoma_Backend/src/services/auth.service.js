// bokoma_backend/src/services/auth.service.js
// ============================================================================
// 🔐 AUTH SERVICE - Gestion centralisée des tokens JWT et cookies
// ============================================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ============================================================================
// 🔹 CONFIGURATION JWT (centralisée)
// ============================================================================

const JWT_CONFIG = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-prod',
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer: 'bokoma-api',
    audience: 'bokoma-users',
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-prod',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'bokoma-api',
    audience: 'bokoma-users',
  },
  cookie: {
    name: 'bokoma_refresh_token', // ✅ Nom cohérent avec le frontend/backend
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en ms
    path: '/',
  },
};

// ============================================================================
// 🔹 SIGNATURE DES TOKENS
// ============================================================================

/**
 * Génère un access token JWT avec payload enrichi
 * @param {Object} user - Instance Mongoose User
 * @returns {string} Access token signé
 */
const signAccessToken = (user) => {
  if (!user?._id) {
    throw new Error('User ID required to sign access token');
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email?.toLowerCase(),
      role: user.role || 'customer',
      firstName: user.firstName,
      lastName: user.lastName,
    },
    JWT_CONFIG.access.secret,
    {
      expiresIn: JWT_CONFIG.access.expiresIn,
      issuer: JWT_CONFIG.access.issuer,
      audience: JWT_CONFIG.access.audience,
      jwtid: crypto.randomBytes(8).toString('hex'), // ✅ JTI unique pour révocation
    }
  );
};

/**
 * Génère un refresh token JWT
 * @param {Object} user - Instance Mongoose User
 * @returns {string} Refresh token signé
 */
const signRefreshToken = (user) => {
  if (!user?._id) {
    throw new Error('User ID required to sign refresh token');
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      type: 'refresh',
    },
    JWT_CONFIG.refresh.secret,
    {
      expiresIn: JWT_CONFIG.refresh.expiresIn,
      issuer: JWT_CONFIG.refresh.issuer,
      audience: JWT_CONFIG.refresh.audience,
      jwtid: crypto.randomBytes(8).toString('hex'), // ✅ JTI unique
    }
  );
};

// ============================================================================
// 🔹 HASH DU REFRESH TOKEN (pour stockage sécurisé en DB)
// ============================================================================

/**
 * Crée une empreinte SHA-256 d'un token pour stockage sécurisé
 * @param {string} token - Token brut
 * @returns {string} Hash hexadécimal
 */
const hashToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Valid token string required for hashing');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Sauvegarde l'empreinte du refresh token en base de données
 * @param {Object} user - Instance Mongoose User
 * @param {string} refreshToken - Refresh token brut
 * @returns {Promise<void>}
 */
const saveRefreshTokenFingerprint = async (user, refreshToken) => {
  try {
    const hashed = hashToken(refreshToken);
    user.refreshToken = hashed;
    await user.save({ validateBeforeSave: false });
  } catch (err) {
    // ⚠️ Log l'erreur mais ne bloque pas le flux d'authentification
    console.error('⚠️ [AuthService] Failed to save refresh token fingerprint:', {
      userId: user?._id,
      error: err?.message,
    });
    // On continue : l'utilisateur peut quand même se connecter
  }
};

// ============================================================================
// 🔹 ENVOI DES TOKENS (réponse HTTP + cookie)
// ============================================================================

/**
 * Envoie les tokens JWT et configure le cookie refresh token
 * @param {Object} user - Instance Mongoose User
 * @param {number} statusCode - Code HTTP de la réponse (200, 201, etc.)
 * @param {Object} res - Objet réponse Express
 * @param {Object} options - Options supplémentaires
 * @param {boolean} options.rotateToken - Si true, invalide l'ancien refresh token
 */
const sendTokens = async (user, statusCode, res, options = {}) => {
  const { rotateToken = false } = options;

  // ✅ Générer les tokens
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // ✅ Rotation du refresh token si demandé (sécurité renforcée)
  if (rotateToken && user.refreshToken) {
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
  }

  // ✅ Sauvegarder l'empreinte du NOUVEAU refresh token
  await saveRefreshTokenFingerprint(user, refreshToken);

  // ✅ Configuration du cookie (environnement-aware)
  const isProduction = process.env.NODE_ENV === 'production';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const isLocalhost = clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1');

  res.cookie(JWT_CONFIG.cookie.name, refreshToken, {
    httpOnly: true, // ✅ Inaccessible via JavaScript frontend
    secure: isProduction && !isLocalhost, // ✅ HTTPS requis en prod (sauf localhost)
    sameSite: isProduction && !isLocalhost ? 'none' : 'lax', // ✅ 'lax' pour localhost
    path: JWT_CONFIG.cookie.path,
    maxAge: JWT_CONFIG.cookie.maxAge,
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined, // Optionnel : domaine personnalisé
  });

  // ✅ Formatage sécurisé de l'objet user pour la réponse
  const userResponse = {
    _id: user._id.toString(),
    email: user.email?.toLowerCase(),
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role || 'customer',
    phone: user.phone,
    country: user.country,
    avatar: user.avatar,
    isVerified: user.isVerified,
    // ✅ Wishlist peuplée si disponible (évite un appel supplémentaire)
    wishlist: user.wishlist?.map?.(item => 
      typeof item === 'object' ? { _id: item._id?.toString(), name: item.name } : { _id: item?.toString() }
    ) || [],
  };

  // ✅ Réponse JSON standardisée
  res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? 'Inscription réussie' : 'Connexion réussie',
    data: {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: JWT_CONFIG.access.expiresIn,
      user: userResponse,
    },
  });
};

// ============================================================================
// 🔹 UTILITAIRES DE VÉRIFICATION
// ============================================================================

/**
 * Vérifie et décode un access token
 * @param {string} token - Access token brut
 * @returns {Object} Payload décodé
 * @throws {Error} Si le token est invalide
 */
const verifyAccessToken = (token) => {
  if (!token) {
    throw new Error('Access token required');
  }

  try {
    return jwt.verify(token, JWT_CONFIG.access.secret, {
      issuer: JWT_CONFIG.access.issuer,
      audience: JWT_CONFIG.access.audience,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Access token invalide');
    }
    throw err;
  }
};

/**
 * Vérifie et décode un refresh token
 * @param {string} token - Refresh token brut
 * @returns {Object} Payload décodé
 * @throws {Error} Si le token est invalide
 */
const verifyRefreshToken = (token) => {
  if (!token) {
    throw new Error('Refresh token required');
  }

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.refresh.secret, {
      issuer: JWT_CONFIG.refresh.issuer,
      audience: JWT_CONFIG.refresh.audience,
    });

    // ✅ Vérifier que c'est bien un refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Refresh token invalide');
    }
    throw err;
  }
};

/**
 * Révoque tous les refresh tokens d'un utilisateur (déconnexion forcée)
 * @param {Object} user - Instance Mongoose User
 * @returns {Promise<void>}
 */
const revokeAllRefreshTokens = async (user) => {
  if (user?.refreshToken) {
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
  }
};

// ============================================================================
// 🔹 EXPORTS
// ============================================================================

module.exports = {
  // Signature
  signAccessToken,
  signRefreshToken,
  
  // Hash & stockage
  hashToken,
  saveRefreshTokenFingerprint,
  
  // Envoi complet
  sendTokens,
  
  // Vérification
  verifyAccessToken,
  verifyRefreshToken,
  
  // Révocation
  revokeAllRefreshTokens,
  
  // Config (utile pour les tests)
  JWT_CONFIG,
};