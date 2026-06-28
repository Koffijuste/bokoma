// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// ✅ UN SEUL import du contrôleur
const ctrl = require('../controllers/auth.controller');
const { protect, restrictTo } = require('../middlewares/auth');

// Middleware de validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ Validation errors:', errors.array());
    }
    return res.status(422).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Règles de validation
const emailRule = body('email')
  .trim()
  .notEmpty().withMessage('Email requis')
  .isEmail().withMessage('Format invalide')
  .normalizeEmail();

const passwordRule = body('password')
  .notEmpty().withMessage('Mot de passe requis')
  .isLength({ min: 6 }).withMessage('Minimum 6 caractères');

// 🔍 DEBUG : Vérifier ce qui est exporté
console.log('\n🔍 [DEBUG] Exports du contrôleur auth:');
console.log('  - register:', typeof ctrl.register);
console.log('  - login:', typeof ctrl.login);
console.log('  - refreshToken:', typeof ctrl.refreshToken);
console.log('  - logout:', typeof ctrl.logout);
console.log('  - getMe:', typeof ctrl.getMe);
console.log('  - updateProfile:', typeof ctrl.updateProfile);
console.log('  - updatePassword:', typeof ctrl.updatePassword);
console.log('  - forgotPassword:', typeof ctrl.forgotPassword);
console.log('  - resetPassword:', typeof ctrl.resetPassword);
console.log('  - verifyEmail:', typeof ctrl.verifyEmail);
console.log('🔍 [DEBUG] ═══════════════════════════════════════\n');

// ───────── ROUTES PUBLIQUES ─────────

// POST /auth/register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('Prénom requis'),
  body('lastName').trim().notEmpty().withMessage('Nom requis'),
  emailRule,
  passwordRule,
], validate, ctrl.register);

// POST /auth/login
router.post('/login', [emailRule, passwordRule], validate, ctrl.login);

// POST /auth/forgot-password
router.post('/forgot-password', [emailRule], validate, ctrl.forgotPassword);

// PATCH /auth/reset-password/:token
router.patch('/reset-password/:token', [passwordRule], validate, ctrl.resetPassword);

// POST /auth/verify-email
router.post('/verify-email', ctrl.verifyEmail);

// POST /auth/refresh
router.post('/refresh', ctrl.refreshToken);

// ───────── ROUTES PROTÉGÉES ─────────

// POST /auth/logout
router.post('/logout', protect, ctrl.logout);

// GET /auth/me
router.get('/me', protect, ctrl.getMe);

// PATCH /auth/me (update profile)
router.patch('/me', protect, ctrl.updateProfile);

// PATCH /auth/me/password
router.patch('/me/password', protect, ctrl.updatePassword);

module.exports = router;