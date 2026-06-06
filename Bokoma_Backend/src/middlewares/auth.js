// bokoma_backend/src/middlewares/auth.js
// ============================================================================
// 🔐 AUTH MIDDLEWARES — Avec config JWT centralisée
// ============================================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const jwtConfig = require('../config/jwt'); // ✅ Import config centralisée

/**
 * Middleware protect — Vérifie le token avec config centralisée
 */
const protect = async (req, res, next) => {
  let token;

  // Extraire depuis header: Authorization: Bearer <token>
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

 // ✅ AJOUT : Fallback vers cookie si pas de header (pour compatibilité)
if (!token && req.cookies?.bokoma_access_token) {
  token = req.cookies.bokoma_access_token;
  if (process.env.NODE_ENV === 'development') {
    console.log('🍪 [protect] Token found in cookie');
  }
}

  // Pas de token → continuer (routes publiques)
  if (!token) {
    return next();
  }

  try {
    // ✅ Vérifier avec config centralisée (MÊMES options que la signature)
    const decoded = jwt.verify(token, jwtConfig.access.secret, {
      issuer: jwtConfig.access.issuer,
      audience: jwtConfig.access.audience,
      ...jwtConfig.options,
    });

    // Trouver l'utilisateur
    const user = await User.findById(decoded.userId)
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');

    if (!user || !user.isActive) {
      return next(new AppError('Utilisateur introuvable ou inactif', 401));
    }

    // Attacher user à la requête
    req.user = {
      userId: user._id.toString(),
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'customer',
      phone: user.phone,
      isVerified: user.isVerified,
      avatar: user.avatar,
    };

    next();

  } catch (err) {
    // Debug erreur JWT en dev
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [protect] JWT verification failed:', {
        errorName: err.name,
        errorMessage: err.message,
        expectedIssuer: jwtConfig.access.issuer,
        expectedAudience: jwtConfig.access.audience,
        tokenPreview: token?.slice(0, 30) + '...',
      });
    }

    // Gestion propre des erreurs
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Session expirée, veuillez vous reconnecter', 401));
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return next(new AppError('Token invalide', 401));
    }
    
    console.error('❌ [protect] Unexpected error:', err.message);
    return next(new AppError('Erreur d\'authentification', 500));
  }
};

/**
 * Middleware authorize — Vérifie les rôles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Accès refusé : authentification requise', 401));
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(new AppError(
        `Accès refusé : rôle "${req.user.role}" non autorisé`, 
        403
      ));
    }
    
    next();
  };
};

/**
 * Middleware requireAuth — Force l'authentification
 */
const requireAuth = (req, res, next) => {
  protect(req, res, (err) => {
    if (err) return next(err);
    if (!req.user) {
      return next(new AppError('Veuillez vous connecter', 401));
    }
    next();
  });
};

module.exports = { protect, authorize, requireAuth };