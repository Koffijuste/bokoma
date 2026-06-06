// src/routes/auth.routes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Middleware de validation simple
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // 🔍 Debug en dev
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

// ───────── ROUTES ─────────

// POST /auth/login
router.post('/login', [emailRule, passwordRule], validate, ctrl.login);


// POST /auth/register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('Prénom requis'),
  body('lastName').trim().notEmpty().withMessage('Nom requis'),
  emailRule,
  passwordRule,
], validate, ctrl.register);

// Autres routes
router.post('/refresh', ctrl.refreshToken);
router.post('/logout', ctrl.logout);
router.post('/forgot-password', [emailRule], validate, ctrl.forgotPassword);
router.patch('/reset-password/:token', [passwordRule], validate, ctrl.resetPassword);
router.get('/me', protect, ctrl.getMe);

module.exports = router;