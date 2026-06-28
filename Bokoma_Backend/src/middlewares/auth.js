// bokoma_backend/src/middlewares/auth.js
// ============================================================================
// 🔐 AUTH MIDDLEWARES — Avec config JWT centralisée
// ============================================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const jwtConfig = require('../config/jwt');

/**
 * Middleware protect — Vérifie le token avec config centralisée
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token && req.cookies?.bokoma_access_token) {
    token = req.cookies.bokoma_access_token;
  }

  // ✅ Hard fail si pas de token
  if (!token) {
    return next(new AppError('Authentification requise. Veuillez vous connecter.', 401));
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.access.secret, {
      issuer: jwtConfig.access.issuer,
      audience: jwtConfig.access.audience,
    });

    const user = await User.findById(decoded.userId)
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');

    if (!user || !user.isActive) {
      return next(new AppError('Utilisateur introuvable ou inactif', 401));
    }

    req.user = {
      userId: user._id.toString(),
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,         // ✅ Ajout phone (utilisé dans createOrder)
      role: user.role || 'customer',
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Session expirée', 401));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Token invalide', 401));
    }
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

/**
 * Restreint l'accès à certains rôles
 * Usage: restrictTo('admin', 'manager')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié. Veuillez vous connecter.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôle requis: ${roles.join(' ou ')}. Votre rôle: ${req.user.role}`,
      });
    }

    next();
  };
};

module.exports = { protect, restrictTo, authorize, requireAuth };