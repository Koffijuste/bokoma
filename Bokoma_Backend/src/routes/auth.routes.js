// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// ✅ UN SEUL import du contrôleur
const ctrl = require('../controllers/auth.controller');
const { protect, restrictTo } = require('../middlewares/auth');
const {
  authStrictLimiter,    // login, forgot-password, reset-password-otp
  authRegisterLimiter,  // register, verify-email
} = require('../middlewares/rateLimiters');

// Middleware de validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
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

// ───────── ROUTES PUBLIQUES ─────────

// POST /auth/register (anti spam : 10/h)
router.post('/register', authRegisterLimiter, [
  body('firstName').trim().notEmpty().withMessage('Prénom requis'),
  body('lastName').trim().notEmpty().withMessage('Nom requis'),
  emailRule,
  passwordRule,
], validate, ctrl.register);

// POST /auth/login (anti brute-force : 10/15min, ne compte pas les succès)
router.post('/login', authStrictLimiter, [emailRule, passwordRule], validate, ctrl.login);

// POST /auth/forgot-password (anti brute-force OTP)
router.post('/forgot-password', authStrictLimiter, [emailRule], validate, ctrl.forgotPassword);

// PATCH /auth/reset-password/:token   (lien cliquable — rétro-compat)
router.patch('/reset-password/:token', authStrictLimiter, [passwordRule], validate, ctrl.resetPassword);

// ✅ POST /auth/reset-password-otp   (code OTP 6 chiffres — anti brute-force)
router.post('/reset-password-otp', authStrictLimiter, [
  body('email').trim().notEmpty().withMessage('Email requis').isEmail().withMessage('Format invalide').normalizeEmail(),
  body('otp').trim().notEmpty().withMessage('Code OTP requis').isLength({ min: 6, max: 6 }).withMessage('Le code doit contenir 6 chiffres'),
  body('password').notEmpty().withMessage('Mot de passe requis').isLength({ min: 8 }).withMessage('Minimum 8 caractères'),
], validate, ctrl.resetPasswordWithOtp);

// POST /auth/verify-email
router.post('/verify-email', authRegisterLimiter, ctrl.verifyEmail);

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