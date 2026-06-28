// bokoma_backend/src/controllers/auth.controller.js
// ============================================================================
// 🔐 AUTH CONTROLLER - Gestion de l'authentification et des tokens JWT
// ============================================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // ✅ AJOUT : Import crypto
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');
const jwtConfig = require('../config/jwt');

// ============================================================================
// POST /api/v1/auth/register — Inscription utilisateur
// ============================================================================
exports.register = async (req, res, next) => {
  try {
    console.log('\n📝 [Auth] ═══════════════════════════════════════');
    console.log('📝 [Auth] REGISTER - Début');
    console.log('📝 [Auth] Body reçu:', req.body);
    
    const { firstName, lastName, email, password, phone } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return next(new AppError('Tous les champs sont requis', 400));
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new AppError('Cet email est déjà utilisé', 409));
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim(),
      role: 'customer',
      isVerified: false,
    });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

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

    console.log('✅ [Auth] Register réussi pour:', user.email);
    console.log('📝 [Auth] ═══════════════════════════════════════\n');

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

    if (!email || !password) {
      return next(new AppError('Email et mot de passe requis', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user || !user.isActive) {
      return next(new AppError('Identifiants invalides', 401));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Identifiants invalides', 401));
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

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

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });

  } catch (err) {
    console.error('❌ [AuthController] login error:', err);
    next(err);
  }
};

// ============================================================================
// POST /auth/refresh — Rafraîchir le token
// ============================================================================
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.bokoma_refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token manquant' });
    }

    const decoded = jwt.verify(refreshToken, jwtConfig.refresh.secret, {
      issuer: jwtConfig.refresh.issuer,
      audience: jwtConfig.refresh.audience,
    });

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé ou inactif' });
    }

    // ✅ Inclure le rôle dans le nouveau token
    const newAccessToken = jwt.sign(
      { userId: user._id, role: user.role },
      jwtConfig.access.secret,
      {
        expiresIn: jwtConfig.access.expiresIn,
        issuer: jwtConfig.access.issuer,
        audience: jwtConfig.access.audience,
      }
    );

    res.cookie('bokoma_access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 1000,
    });

    res.json({ success: true, message: 'Token rafraîchi', accessToken: newAccessToken });

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh token expiré' });
    }
    res.status(401).json({ success: false, message: 'Refresh token invalide' });
  }
};

// ============================================================================
// POST /auth/logout — Déconnexion
// ============================================================================
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('bokoma_access_token');
    res.clearCookie('bokoma_refresh_token');

    res.json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (err) {
    console.error('❌ [Auth] logout error:', err);
    next(err);
  }
};

// ============================================================================
// GET /auth/me — Récupérer ses infos
// ============================================================================
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error('❌ [Auth] getMe error:', err);
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

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Mot de passe actuel incorrect', 401));
    }

    user.password = newPassword;
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
// POST /auth/forgot-password — Mot de passe oublié
// ============================================================================
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte trouvé avec cet email',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;
    console.log('📧 [Auth] Reset URL:', resetUrl);

    res.json({
      success: true,
      message: 'Email de réinitialisation envoyé',
      resetUrl,
    });
  } catch (err) {
    console.error('❌ [Auth] forgotPassword error:', err);
    next(err);
  }
};

// ============================================================================
// PATCH /auth/reset-password/:token — Réinitialiser le mot de passe
// ✅ UNE SEULE DÉFINITION (la duplication a été supprimée)
// ============================================================================
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

    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Token invalide ou expiré', 400));
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = null;
    await user.save();

    console.log('✅ [Auth] Password reset successful for:', user.email);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (err) {
    console.error('❌ [Auth] resetPassword error:', err);
    next(err);
  }
};

// ============================================================================
// POST /api/v1/auth/verify-email — Vérifier l'email
// ============================================================================
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new AppError('Token de vérification requis', 400));
    }

    const user = await User.findOne({ 
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new AppError('Token de vérification invalide ou expiré', 400));
    }

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

// console.log('✅ [Auth] resetPassword exporté:', typeof exports.resetPassword);