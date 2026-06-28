// src/server.js
require('dotenv').config();

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const connectDB  = require('./config/db');

const app = express();

// ─── Configuration de base ────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');

// ─── Sécurité ─────────────────────────────────────────────────────────────────
// ✅ Un seul appel helmet() avec toutes les options
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src':  ["'self'", "'unsafe-inline'", 'https:'],
      'img-src':     ["'self'", 'data:', 'blob:', 'https:', 'res.cloudinary.com'],
      'style-src':   ["'self'", "'unsafe-inline'", 'https:'],
      'connect-src': ["'self'", 'https:', 'http://localhost:*'],
    },
  },
  crossOriginOpenerPolicy:  process.env.NODE_ENV === 'production' ? { policy: 'same-origin' } : false,
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? { policy: 'require-corp' } : false,
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:         process.env.CLIENT_URL || 'http://localhost:3000',
  credentials:    true,
  methods:        ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));           // ✅ 100mb → 10mb (sécurité)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Sanitization & logging ───────────────────────────────────────────────────
app.use(require('./middlewares/sanitize'));
app.use(morgan('dev'));

// ─── Fichiers statiques ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Trop de tentatives, réessayez dans quelques minutes.' },
});

// ─── Health check (avant rate limiter global) ─────────────────────────────────
app.use('/api/v1/health', require('./routes/health.routes'));

// ─── Rate limiter global ──────────────────────────────────────────────────────
app.use(apiLimiter);

// ─── Routes API ───────────────────────────────────────────────────────────────

// Webhook (pas de rate limiter — appelé par CinetPay)
app.use('/api/v1/webhook', require('./routes/webhook.routes'));

// Auth
app.use('/api/v1/auth', authLimiter, require('./routes/auth.routes'));

// Ressources
app.use('/api/v1/users',      require('./routes/user.routes'));
app.use('/api/v1/products',   require('./routes/product.routes'));
app.use('/api/v1/categories', require('./routes/category.routes'));
app.use('/api/v1/cart',       require('./routes/cart.routes'));

// ✅ Orders — order.routes gère TOUTES les routes /orders (clients + admin)
app.use('/api/v1/orders',     require('./routes/order.routes'));

// ✅ Payments admin — préfixe dédié, plus de conflit avec /orders
// Anciennes URLs :                     Nouvelles URLs :
//   GET /api/v1/orders/payments/...  →  GET /api/v1/payments/pending
//   GET /api/v1/orders/notifications →  GET /api/v1/payments/notifications
app.use('/api/v1/payments',   require('./routes/payment.routes'));

app.use('/api/v1/reviews',    require('./routes/review.routes'));
app.use('/api/v1/coupons',    require('./routes/coupon.routes'));

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/v1/test/cinetpay', require('./routes/test.cinetpay.routes'));
}

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route non trouvée: ${req.originalUrl}` });
});

// ─── Error handler global ─────────────────────────────────────────────────────
app.use(require('./middlewares/errorHandler'));

// ─── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const { startPaymentExpiryJob }       = require('./jobs/paymentExpiry.job');
const { startPaymentVerificationJob } = require('./jobs/paymentVerification.job');

connectDB()
  .then(() => {
    console.log('✅ MongoDB connecté');
    startPaymentExpiryJob();
    startPaymentVerificationJob();
    app.listen(PORT, () => {
      console.log(`🚀 Serveur : http://localhost:${PORT}`);
      console.log(`🏥 Health  : http://localhost:${PORT}/api/v1/health`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB erreur:', err.message);
    process.exit(1);
  });

module.exports = app;