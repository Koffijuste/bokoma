// bokoma_backend/src/controllers/auth.controller.js
// ============================================================================
// 🔐 AUTH CONTROLLER - Gestion de l'authentification et des tokens JWT
// ============================================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');
const jwtConfig = require('../config/jwt'); // ✅ Import config JWT centralisée

// ============================================================================
// POST /api/v1/auth/register — Inscription utilisateur
// ============================================================================
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // ✅ Validation
    if (!firstName || !lastName || !email || !password) {
      return next(new AppError('Tous les champs sont requis', 400));
    }

    // ✅ Vérifier si utilisateur existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new AppError('Cet email est déjà utilisé', 409));
    }

    // ✅ Créer l'utilisateur (le password sera hashé par le middleware pre-save)
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim(),
      role: 'customer',
      isVerified: false,
    });

    // ✅ Générer tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // ✅ Mettre à jour le refresh token (un seul save)
    user.refreshToken = refreshToken;
    await user.save();

    // ✅ Définir cookies sécurisés
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    };

    res.cookie('bokoma_access_token', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });
    
    res.cookie('bokoma_refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ Réponse
    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });

  } catch (err) {
    console.error('❌ [AuthController] register error:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new AppError(messages.join(', '), 422));
    }
    
    next(err);
  }
};

// ============================================================================
// POST /api/v1/auth/login — Connexion utilisateur
// ============================================================================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ✅ Validation
    if (!email || !password) {
      return next(new AppError('Email et mot de passe requis', 400));
    }

    // ✅ Trouver l'utilisateur (inclure password pour comparaison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user || !user.isActive) {
      return next(new AppError('Identifiants invalides', 401));
    }

    // ✅ Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Identifiants invalides', 401));
    }

    // ✅ Générer tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // ✅ Mettre à jour TOUT en une seule fois (un seul save)
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // ✅ Définir cookies sécurisés
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    };

    res.cookie('bokoma_access_token', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1h
    });
    
    res.cookie('bokoma_refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7j
    });

    // ✅ Réponse
    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: user.toJSON(),
        accessToken, // Pour compatibilité frontend
      },
    });

  } catch (err) {
    console.error('❌ [AuthController] login error:', err);
    next(err);
  }
};

// ============================================================================
// POST /api/v1/auth/refresh — Rafraîchir le token d'accès
// ============================================================================
exports.refreshToken = async (req, res, next) => {
  try {
    // ✅ 1. Chercher le refresh token dans PLUSIEURS endroits
    let refreshToken = 
      req.cookies?.bokoma_refresh_token ||      // Cookie principal
      req.cookies?.refresh_token ||             // Fallback nom alternatif
      req.body?.refreshToken ||                 // Body (moins sécurisé)
      null;

    // 🔍 Debug en dev
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [refreshToken] Debug:', {
        hasCookies: !!req.cookies,
        cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
        hasBokomaRefreshToken: !!req.cookies?.bokoma_refresh_token,
        hasRefreshToken: !!req.cookies?.refresh_token,
        hasBodyRefreshToken: !!req.body?.refreshToken,
      });
    }

    if (!refreshToken) {
      return next(new AppError('Refresh token requis. Veuillez vous reconnecter.', 401));
    }

    // ✅ 2. Vérifier avec config centralisée
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, jwtConfig.refresh.secret, {
        issuer: jwtConfig.refresh.issuer,
        audience: jwtConfig.refresh.audience,
        ...jwtConfig.options,
      });
    } catch (err) {
      // Nettoyer les cookies
      res.clearCookie('bokoma_refresh_token', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/' 
      });
      res.clearCookie('bokoma_access_token', { path: '/' });

      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Refresh token expiré, veuillez vous reconnecter', 401));
      }
      if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
        return next(new AppError('Refresh token invalide', 401));
      }
      throw err;
    }

    // ✅ 3. Trouver l'utilisateur
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || !user.isActive) {
      return next(new AppError('Utilisateur introuvable ou inactif', 401));
    }

    // ✅ 4. Vérifier que le token correspond à celui stocké
    if (user.refreshToken && user.refreshToken !== refreshToken) {
      res.clearCookie('bokoma_refresh_token', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/' 
      });
      return next(new AppError('Session invalide, veuillez vous reconnecter', 401));
    }

    // ✅ 5. Générer NOUVEAUX tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    // ✅ 6. Mettre à jour le refresh token en base
    user.refreshToken = newRefreshToken;
    await user.save();

    // ✅ 7. Définir cookies sécurisés
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // ✅ lax en dev
      path: '/',
    };

    res.cookie('bokoma_access_token', newAccessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1h
    });
    
    res.cookie('bokoma_refresh_token', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7j
    });

    // ✅ 8. Réponse avec accessToken (pour le frontend qui lit le body)
    res.json({
      success: true,
      message: 'Token rafraîchi avec succès',
      data: {
        accessToken: newAccessToken,
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
        },
      },
    });

  } catch (err) {
    console.error('❌ [AuthController] refreshToken error:', err);
    res.clearCookie('bokoma_access_token', { path: '/' });
    res.clearCookie('bokoma_refresh_token', { path: '/' });
    next(err);
  }
};

// ============================================================================
// POST /api/v1/auth/logout — Déconnexion
// ============================================================================
exports.logout = async (req, res, next) => {
  try {
    // ✅ Nettoyer les cookies
    res.clearCookie('bokoma_access_token', { path: '/' });
    res.clearCookie('bokoma_refresh_token', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    // ✅ Optionnel: Révoquer le refresh token en base
    if (req.user?.userId) {
      await User.findByIdAndUpdate(req.user.userId, { refreshToken: null });
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie',
    });

  } catch (err) {
    console.error('❌ [AuthController] logout error:', err);
    next(err);
  }
};

// ============================================================================
// GET /api/v1/auth/me — Profil utilisateur connecté
// ============================================================================
exports.getMe = async (req, res, next) => {
  try {
    // ✅ req.user est attaché par le middleware protect()
    if (!req.user) {
      return next(new AppError('Utilisateur non authentifié', 401));
    }

    // ✅ Re-fetch user pour données à jour (optionnel)
    const user = await User.findById(req.user.userId)
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    res.json({
      success: true,
      data: { user: user.toJSON() },
    });

  } catch (err) {
    console.error('❌ [AuthController] getMe error:', err);
    next(err);
  }
};

// ============================================================================
// PATCH /api/v1/auth/me — Mettre à jour son profil
// ============================================================================
exports.updateProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Utilisateur non authentifié', 401));
    }

    const { firstName, lastName, phone, avatar } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName.trim();
    if (lastName) updates.lastName = lastName.trim();
    if (phone) updates.phone = phone.trim();
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: { user: user.toJSON() },
    });

  } catch (err) {
    console.error('❌ [AuthController] updateProfile error:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new AppError(messages.join(', '), 422));
    }
    
    next(err);
  }
};

// ============================================================================
// PATCH /api/v1/auth/me/password — Changer son mot de passe
// ============================================================================
exports.updatePassword = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Utilisateur non authentifié', 401));
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Mot de passe actuel et nouveau requis', 400));
    }

    if (newPassword.length < 8) {
      return next(new AppError('Le nouveau mot de passe doit contenir au moins 8 caractères', 400));
    }

    // ✅ Trouver user avec password pour vérification
    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    // ✅ Vérifier mot de passe actuel
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Mot de passe actuel incorrect', 401));
    }

    // ✅ Mettre à jour password (hashé par pre-save middleware)
    user.password = newPassword;
    await user.save();

    // ✅ Optionnel: Révoquer tous les refresh tokens (déconnexion des autres appareils)
    user.refreshToken = null;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    });

  } catch (err) {
    console.error('❌ [AuthController] updatePassword error:', err);
    next(err);
  }
};

// ============================================================================
// POST /api/v1/auth/forgot-password — Demande de réinitialisation
// ============================================================================
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Email requis', 400));
    }

    // ✅ Trouver l'utilisateur (ne pas révéler s'il existe ou non pour sécurité)
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // ✅ Toujours répondre 200 pour éviter l'énumération d'emails
    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: 'Si cet email existe, vous recevrez un lien de réinitialisation',
      });
    }

    // ✅ Générer token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
    await user.save();

    // ✅ Envoyer email (non bloquant)
    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;
    sendPasswordResetEmail(user, resetUrl).catch(err => 
      console.error('❌ Password reset email failed:', err)
    );

    res.json({
      success: true,
      message: 'Si cet email existe, vous recevrez un lien de réinitialisation',
    });

  } catch (err) {
    console.error('❌ [AuthController] forgotPassword error:', err);
    next(err);
  }
};

// ============================================================================
// PATCH /api/v1/auth/reset-password/:token — Réinitialiser le mot de passe
// ============================================================================
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return next(new AppError('Token et nouveau mot de passe requis', 400));
    }

    if (newPassword.length < 8) {
      return next(new AppError('Le mot de passe doit contenir au moins 8 caractères', 400));
    }

    // ✅ Hasher le token pour comparaison (stocké en base sous forme hashée)
    const resetToken = crypto.createHash('sha256').update(token).digest('hex');

    // ✅ Trouver l'utilisateur avec token valide et non expiré
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Token invalide ou expiré', 400));
    }

    // ✅ Mettre à jour le mot de passe
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // ✅ Optionnel: Révoquer tous les refresh tokens
    user.refreshToken = null;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });

  } catch (err) {
    console.error('❌ [AuthController] resetPassword error:', err);
    next(err);
  }
};

// ============================================================================
// POST /api/v1/auth/verify-email — Vérifier l'email (optionnel)
// ============================================================================
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new AppError('Token de vérification requis', 400));
    }

    // ✅ Trouver l'utilisateur par token (implémentation à adapter selon votre flow)
    const user = await User.findOne({ 
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new AppError('Token de vérification invalide ou expiré', 400));
    }

    // ✅ Marquer comme vérifié
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email vérifié avec succès',
      data: { user: user.toJSON() },
    });

  } catch (err) {
    console.error('❌ [AuthController] verifyEmail error:', err);
    next(err);
  }
};


exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return next(new AppError('Token et mot de passe requis', 400));
    }

    if (password.length < 8) {
      return next(new AppError('Le mot de passe doit contenir au moins 8 caractères', 400));
    }

    // Hasher le token pour comparaison
    const crypto = require('crypto');
    const resetToken = crypto.createHash('sha256').update(token).digest('hex');

    // Trouver l'utilisateur avec token valide et non expiré
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Token invalide ou expiré', 400));
    }

    // Mettre à jour le mot de passe (hashé par le pre-save middleware)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Optionnel: Révoquer tous les refresh tokens
    user.refreshToken = null;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });

  } catch (err) {
    console.error('❌ [AuthController] resetPassword error:', err);
    next(err);
  }
};