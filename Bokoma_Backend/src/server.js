// src/server.js
require('dotenv').config();

// ─── 🔍 ENV CHECK (temporaire — retirer après validation) ──────────────
if (process.env.NODE_ENV !== 'production') {
  const apiKey = process.env.CINETPAY_API_KEY;
  const apiPassword = process.env.CINETPAY_API_PASSWORD_CI;
  const apiUrl = process.env.CINETPAY_API_URL;
  console.log('🔑 [ENV] CinetPay config:', {
    apiKey: apiKey
      ? `${apiKey.slice(0, 8)}... (${apiKey.length} chars)`
      : '❌ MISSING',
    apiPassword: apiPassword
      ? `******* (${apiPassword.length} chars)`
      : '❌ MISSING',
    apiUrl: apiUrl || '❌ MISSING',
  });
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const dns = require("dns");
const connectDB = require('./config/db');
// const hpp = require('hpp'); // Optionnel

const app = express();

// ─── Configuration de base ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.disable('x-powered-by');

// ─── Middlewares de sécurité et parsing ────────────────────────────────
app.use(helmet());

// ✅ helmet() configuré UNE SEULE FOIS avec options explicites
app.use(helmet({
  // Content Security Policy personnalisé
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", 'https:'],
      "img-src": ["'self'", 'data:', 'blob:', 'https:', 'res.cloudinary.com'], // ✅ Ajout Cloudinary
      "style-src": ["'self'", "'unsafe-inline'", 'https:'],
      "connect-src": ["'self'", 'https:', 'http://localhost:*'], // ✅ Autoriser localhost en dev
    },
  },
  // ✅ Désactiver COOP/COEP qui peuvent bloquer les cookies cross-origin en dev
  crossOriginOpenerPolicy: process.env.NODE_ENV === 'production' ? { policy: 'same-origin' } : false,
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? { policy: 'require-corp' } : false,
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());


// Data sanitization
app.use(require('./middlewares/sanitize'));

// Prevent HTTP parameter pollution (optionnel)
// app.use(hpp());

app.use(morgan('dev'));

// ─── ✅ HEALTH CHECK - PLACÉ AVANT LE RATE LIMITER ─────────────────────

app.use('/api/v1/health', require('./routes/health.routes'));


// ✅ Servir les fichiers statiques du dossier uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Rate Limiters ─────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Plus restrictif pour l'authentification
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives, réessayez dans quelques minutes.' },
});

// Appliquer le rate limiter global (NE s'applique PAS à /health)
app.use(apiLimiter);

// AVANT les routes, pour logger TOUS les bodies reçus
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development' && req.path.includes('/auth')) {
    console.log('📦 Raw body received:', {
      path: req.path,
      method: req.method,
      contentType: req.headers['content-type'],
      body: req.body,
      raw: req.rawBody, // Si vous utilisez raw-body middleware
    });
  }
  next();
});

// ─── Routes API ────────────────────────────────────────────────────────

app.use('/api/v1/auth', authLimiter, require('./routes/auth.routes'));

// Autres routes (déjà protégées par apiLimiter global)
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/products', require('./routes/product.routes'));
app.use('/api/v1/categories', require('./routes/category.routes'));
app.use('/api/v1/cart', require('./routes/cart.routes'));
app.use('/api/v1/orders', require('./routes/order.routes'));
app.use('/api/v1/reviews', require('./routes/review.routes'));
app.use('/api/v1/coupons', require('./routes/coupon.routes'));

// ─── Gestion des routes non trouvées (404) ─────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route non trouvée: ${req.originalUrl}` });
});

// ─── Error Handler Global (DOIT être le dernier middleware) ────────────
app.use(require('./middlewares/errorHandler'));

// ─── Connexion MongoDB + Démarrage du serveur ──────────────────────────
const PORT = process.env.PORT || 5000;


// Forcer des DNS publics fonctionnels
// dns.setServers([
//   "8.8.8.8",
//   "1.1.1.1"
// ]);

// console.log("DNS utilisés :", dns.getServers());

connectDB()
  .then(() => {
    console.log('✅ MongoDB connecté');
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;