// bokoma_backend/src/controllers/user.controller.js
// ============================================================================
// 👤 USER CONTROLLER — Gestion complète des utilisateurs
// ============================================================================

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { isValidObjectId } = require('mongoose');
const fs = require('fs').promises;

// ============================================================================
// 🔹 HELPERS
// ============================================================================

/**
 * Vérifie que l'utilisateur existe
 */
const findUserOrError = async (userId, next, selectFields = '') => {
  const user = await User.findById(userId).select(selectFields);
  if (!user) {
    return next(new AppError('Utilisateur introuvable', 404));
  }
  return user;
};

/**
 * Nettoie les champs string (trim + rejet des chaînes vides)
 */
const cleanString = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || undefined;
};

// ============================================================================
// 🔹 PROFIL UTILISATEUR
// ============================================================================

/**
 * GET /api/v1/users/me — Profil de l'utilisateur connecté
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'wishlist',
        select: 'name slug images basePrice brand totalStock',
      });

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    console.error('❌ [UserController] getProfile error:', err);
    next(err);
  }
};

/**
 * PATCH /api/v1/users/me — Mise à jour du profil
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'avatar'];
    const updates = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        const value = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
        if (value !== '') updates[field] = value;
      }
    });

    if (Object.keys(updates).length === 0) {
      return next(new AppError('Aucune donnée à mettre à jour', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: { user },
    });
  } catch (err) {
    console.error('❌ [UserController] updateProfile error:', err);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new AppError(messages.join(', '), 400));
    }

    next(err);
  }
};

/**
 * PATCH /api/v1/users/me/password — Changement de mot de passe
 * ✅ RENOMMÉ : updatePassword (au lieu de changePassword)
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Mot de passe actuel et nouveau requis', 400));
    }

    if (newPassword.length < 8) {
      return next(new AppError('Le nouveau mot de passe doit contenir au moins 8 caractères', 400));
    }

    if (!/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return next(new AppError('Le mot de passe doit contenir au moins une majuscule et un chiffre', 400));
    }

    const user = await User.findById(req.user.userId).select('+password');

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Mot de passe actuel incorrect', 401));
    }

    // ✅ Mettre à jour + révoquer les autres sessions
    user.password = newPassword;
    user.refreshToken = null;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès',
    });
  } catch (err) {
    console.error('❌ [UserController] updatePassword error:', err);
    next(err);
  }
};

/**
 * PATCH /api/v1/users/me/avatar — Upload d'avatar
 */
exports.updateAvatar = async (req, res, next) => {
  try {
    console.log('📥 [Avatar] Upload reçu');
    console.log('📎 req.file:', req.file ? {
      path: req.file.path,
      filename: req.file.filename,
      originalname: req.file.originalname,
    } : 'UNDEFINED');

    if (!req.file) {
      return next(new AppError('Aucune image reçue', 400));
    }

    const user = await findUserOrError(req.user.userId, next);
    if (!user) return;

    // ✅ Cloudinary : req.file.path contient déjà l'URL complète
    const newAvatarUrl = req.file.path;
    console.log('✅ [Avatar] Nouvelle URL:', newAvatarUrl);

    // ✅ Supprimer l'ancien avatar de Cloudinary (pas fs.unlink !)
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      try {
        const { deleteImage } = require('../services/upload.service');
        console.log('🗑️ [Avatar] Suppression ancien avatar:', user.avatar);
        await deleteImage(user.avatar);
      } catch (err) {
        console.warn('⚠️ [Avatar] Failed to delete old avatar from Cloudinary:', err.message);
      }
    }

    // ✅ Sauvegarder l'URL Cloudinary
    user.avatar = newAvatarUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar mis à jour',
      data: { avatar: user.avatar },
    });
  } catch (err) {
    console.error('❌ [UserController] updateAvatar error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 STATS UTILISATEUR (pour navbar badges)
// ============================================================================

/**
 * GET /api/v1/users/me/stats — Stats pour badges navbar
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [user, pendingOrders, totalOrders] = await Promise.all([
      User.findById(userId).select('wishlist'),
      Order.countDocuments({
        user: userId,
        status: { $in: ['pending', 'processing', 'shipped'] },
      }).catch(() => 0),
      Order.countDocuments({ user: userId }).catch(() => 0),
    ]);

    res.json({
      success: true,
      data: {
        pendingOrders,
        totalOrders,
        wishlistCount: user?.wishlist?.length || 0,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('❌ [UserController] getUserStats error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 ADRESSES
// ============================================================================

/**
 * POST /api/v1/users/me/addresses — Ajouter une adresse
 */
exports.addAddress = async (req, res, next) => {
  try {
    const { label, fullName, phone, street, city, postalCode, country, isDefault } = req.body;

    if (!fullName || !phone || !street || !city || !country) {
      return next(new AppError('Champs requis manquants (fullName, phone, street, city, country)', 400));
    }

    const user = await findUserOrError(req.user.userId, next);
    if (!user) return;

    // Si nouvelle adresse par défaut, retirer le défaut des autres
    if (isDefault) {
      user.addresses.forEach((a) => { a.isDefault = false; });
    }

    user.addresses.push({
      label: label?.trim() || 'Domicile',
      fullName: fullName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      postalCode: postalCode?.trim() || '',
      country: country.trim(),
      isDefault: isDefault || user.addresses.length === 0,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Adresse ajoutée',
      data: { addresses: user.addresses },
    });
  } catch (err) {
    console.error('❌ [UserController] addAddress error:', err);
    next(err);
  }
};

/**
 * PATCH /api/v1/users/me/addresses/:addressId — Modifier une adresse
 */
exports.updateAddress = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.addressId)) {
      return next(new AppError('ID d\'adresse invalide', 400));
    }

    const user = await findUserOrError(req.user.userId, next);
    if (!user) return;

    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return next(new AppError('Adresse introuvable', 404));
    }

    if (req.body.isDefault) {
      user.addresses.forEach((a) => { a.isDefault = false; });
    }

    const allowedFields = ['label', 'fullName', 'phone', 'street', 'city', 'postalCode', 'country', 'isDefault'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        address[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Adresse mise à jour',
      data: { addresses: user.addresses },
    });
  } catch (err) {
    console.error('❌ [UserController] updateAddress error:', err);
    next(err);
  }
};

/**
 * DELETE /api/v1/users/me/addresses/:addressId — Supprimer une adresse
 */
exports.deleteAddress = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.addressId)) {
      return next(new AppError('ID d\'adresse invalide', 400));
    }

    const user = await findUserOrError(req.user.userId, next);
    if (!user) return;

    const initialLength = user.addresses.length;
    user.addresses = user.addresses.filter(
      (a) => a._id.toString() !== req.params.addressId
    );

    if (user.addresses.length === initialLength) {
      return next(new AppError('Adresse introuvable', 404));
    }

    await user.save();

    res.json({
      success: true,
      message: 'Adresse supprimée',
      data: { addresses: user.addresses },
    });
  } catch (err) {
    console.error('❌ [UserController] deleteAddress error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 WISHLIST
// ============================================================================

/**
 * GET /api/v1/users/me/wishlist — Récupérer la wishlist
 */
exports.getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'wishlist',
        select: 'name slug images basePrice brand totalStock',
      });

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    res.json({
      success: true,
      data: {
        wishlist: user.wishlist,
        count: user.wishlist.length,
      },
    });
  } catch (err) {
    console.error('❌ [UserController] getWishlist error:', err);
    next(err);
  }
};

/**
 * POST /api/v1/users/me/wishlist/:productId — Toggle wishlist
 */
exports.toggleWishlist = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.productId)) {
      return next(new AppError('ID de produit invalide', 400));
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      return next(new AppError('Produit introuvable', 404));
    }

    const user = await findUserOrError(req.user.userId, next);
    if (!user) return;

    const productId = req.params.productId;
    const idx = user.wishlist.findIndex(
      id => id.toString() === productId
    );

    let action;
    if (idx > -1) {
      user.wishlist.splice(idx, 1);
      action = 'removed';
    } else {
      user.wishlist.push(productId);
      action = 'added';
    }

    await user.save();

    res.json({
      success: true,
      message: action === 'added' ? 'Produit ajouté aux favoris' : 'Produit retiré des favoris',
      data: {
        wishlist: user.wishlist,
        action,
        count: user.wishlist.length,
      },
    });
  } catch (err) {
    console.error('❌ [UserController] toggleWishlist error:', err);
    next(err);
  }
};

// ============================================================================
// 🔹 ADMIN — Gestion des utilisateurs
// ============================================================================

/**
 * GET /api/v1/users — Liste des utilisateurs (admin/manager)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.search) {
      filters.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.role) filters.role = req.query.role;
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }

    const [users, total] = await Promise.all([
      User.find(filters)
        .select('-refreshToken -resetPasswordToken -resetPasswordExpires')
        .skip(skip)
        .limit(limit)
        .sort('-createdAt'),
      User.countDocuments(filters),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('❌ [UserController] getAllUsers error:', err);
    next(err);
  }
};

/**
 * GET /api/v1/users/:id — Détails d'un utilisateur (admin/manager)
 */
exports.getUser = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('ID utilisateur invalide', 400));
    }

    const user = await User.findById(req.params.id)
      .select('-refreshToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    console.error('❌ [UserController] getUser error:', err);
    next(err);
  }
};

/**
 * PATCH /api/v1/users/:id/status — Activer/désactiver un utilisateur (admin)
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('ID utilisateur invalide', 400));
    }

    if (req.params.id === req.user.userId) {
      return next(new AppError('Vous ne pouvez pas modifier votre propre statut', 400));
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: user.isActive ? 'Utilisateur activé' : 'Utilisateur désactivé',
      data: { isActive: user.isActive },
    });
  } catch (err) {
    console.error('❌ [UserController] toggleUserStatus error:', err);
    next(err);
  }
};

/**
 * PATCH /api/v1/users/:id/role — Modifier le rôle (admin)
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('ID utilisateur invalide', 400));
    }

    const { role } = req.body;
    const validRoles = ['customer', 'manager', 'admin'];

    if (!role || !validRoles.includes(role)) {
      return next(new AppError(`Rôle invalide. Valeurs acceptées: ${validRoles.join(', ')}`, 400));
    }

    if (req.params.id === req.user.userId) {
      return next(new AppError('Vous ne pouvez pas modifier votre propre rôle', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-refreshToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    res.json({
      success: true,
      message: 'Rôle mis à jour',
      data: { user },
    });
  } catch (err) {
    console.error('❌ [UserController] updateUserRole error:', err);
    next(err);
  }
};

/**
 * DELETE /api/v1/users/:id — Supprimer un utilisateur (admin)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('ID utilisateur invalide', 400));
    }

    if (req.params.id === req.user.userId) {
      return next(new AppError('Vous ne pouvez pas supprimer votre propre compte', 400));
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return next(new AppError('Utilisateur introuvable', 404));
    }

    res.json({
      success: true,
      message: 'Utilisateur supprimé',
    });
  } catch (err) {
    console.error('❌ [UserController] deleteUser error:', err);
    next(err);
  }
};

/**
 * DELETE /api/v1/users/me/avatar — Supprimer l'avatar de l'utilisateur
 */
exports.deleteAvatar = async (req, res, next) => {
  try {
    const user = await findUserOrError(req.user.userId, next);
    if (!user) return;

    if (!user.avatar) {
      return next(new AppError('Aucun avatar à supprimer', 400));
    }

    // ✅ Cloudinary : supprimer depuis Cloudinary (pas fs.unlink !)
    if (user.avatar.includes('cloudinary.com')) {
      try {
        const { deleteImage } = require('../services/upload.service');
        console.log('🗑️ [Avatar] Suppression avatar Cloudinary:', user.avatar);
        await deleteImage(user.avatar);
      } catch (err) {
        console.warn('⚠️ [Avatar] Failed to delete from Cloudinary:', err.message);
      }
    }

    user.avatar = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar supprimé',
      data: { avatar: null },
    });
  } catch (err) {
    console.error('❌ [UserController] deleteAvatar error:', err);
    next(err);
  }
};