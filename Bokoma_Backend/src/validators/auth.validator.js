const { body } = require('express-validator');

const registerRules = [
  body('firstName').trim().notEmpty().withMessage('Prénom requis'),
  body('lastName').trim().notEmpty().withMessage('Nom requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password')
    .isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum')
    .matches(/[A-Z]/).withMessage('Mot de passe : au moins une majuscule')
    .matches(/[0-9]/).withMessage('Mot de passe : au moins un chiffre'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

const forgotPasswordRules = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
];

const resetPasswordRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum')
    .matches(/[A-Z]/).withMessage('Au moins une majuscule')
    .matches(/[0-9]/).withMessage('Au moins un chiffre'),
];

module.exports = { registerRules, loginRules, forgotPasswordRules, resetPasswordRules };