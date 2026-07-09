// src/middlewares/rateLimiters.js
// ============================================================================
// 🚦 RATE LIMITERS — Config centralisée (anti brute-force + anti spam)
// ============================================================================
// Chaque limiteur est monté sur les routes sensibles avec skipSuccessfulRequests
// quand c'est pertinent, pour ne pas pénaliser les users honnêtes qui tapent
// bien leur mot de passe.
// ============================================================================

'use strict';

const rateLimit = require('express-rate-limit');

// 🔐 Endpoints sensibles : login, forgot-password, reset-password-otp
//    → 10 tentatives / IP / 15 min. Largement suffisant pour un user légitime
//    (typo, reconnexion, oubli de mot de passe) ; casse un brute-force classique.
const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Les logins réussis ne comptent pas
  message: {
    success: false,
    message: 'Trop de tentatives. Réessayez dans 15 minutes.',
  },
});

// 📝 Register + verify-email : 10 / IP / 1h — bloque les bots qui créent
//    des comptes en masse, sans gêner un user qui se trompe de formulaire.
const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop d\'inscriptions depuis cette IP. Réessayez dans une heure.',
  },
});

// 🌍 Limiteur global pour toute l'API (déjà câblé dans server.js)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes, réessayez plus tard.',
  },
});

// 🛠  Routes /debug (admin-only). 20 hits / 15 min / IP — un admin qui
//     whiteliste CinetPay n'a besoin de taper la commande que 2-3 fois max.
//     Au-delà, on bloque (anti enumeration IP-echo services / anti scan).
const debugLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes sur /debug. Réessayez dans 15 minutes.',
  },
});

module.exports = {
  authStrictLimiter,
  authRegisterLimiter,
  apiLimiter,
  debugLimiter,
};