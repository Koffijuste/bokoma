// src/server.js

//const dns = require('dns');
//dns.setDefaultResultOrder('ipv4first'); // ✅ Force IPv4 (résout ECONNREFUSED sur certains réseaux)
//dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); // ✅ Force Google DNS + Cloudflare


require('dotenv').config();

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const hpp        = require('hpp');
const cookieParser = require('cookie-parser');
const connectDB  = require('./config/db');
const logger     = require('./utils/logger');
const { apiLimiter } = require('./middlewares/rateLimiters');

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
      // CinetPay injecte un script sur la page de paiement
      'script-src':  ["'self'", "'unsafe-inline'", 'https:', 'https://cdn.cinetpay.com'],
      'img-src':     ["'self'", 'data:', 'blob:', 'https:', 'res.cloudinary.com'],
      'style-src':   ["'self'", "'unsafe-inline'", 'https:'],
      // CinetPay redirige vers des URLs externes (frame + popup)
      'frame-src':   ["'self'", 'https://*.cinetpay.com', 'https://*.cinetpay.net'],
      'connect-src': ["'self'", 'https:', 'http://localhost:*'],
    },
  },
  crossOriginOpenerPolicy:  process.env.NODE_ENV === 'production' ? { policy: 'same-origin' } : false,
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? { policy: 'require-corp' } : false,
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// ✅ CORS strict : domaines exacts uniquement (pas de regex previews Railway/Vercel)
const parseOriginList = (value = '') => value
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter((origin) => origin && origin !== '*');

const developmentOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const allowedOrigins = [
  'https://bokoma.vercel.app',
  ...parseOriginList(process.env.CLIENT_URL),
  ...parseOriginList(process.env.FRONTEND_URL),
  ...parseOriginList(process.env.CORS_ALLOWED_ORIGINS),
  ...(process.env.NODE_ENV === 'production' ? [] : developmentOrigins),
].filter((origin, index, list) => list.indexOf(origin) === index);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Server-to-server / curl sans Origin
  return allowedOrigins.includes(origin.replace(/\/$/, ''));
};

app.use(cors({
  origin:         (origin, cb) => (isAllowedOrigin(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials:    true,
  methods:        ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Webhook raw body (avant express.json) ───────────────────────────────────
// Le webhook CinetPay a besoin du body brut pour vérifier la signature HMAC.
// On capture le raw body ici et on le rend dispo à req.rawBody dans le handler.
// IMPORTANT : on monte le webhook AVANT le rate limiter global pour ne pas
// être limité par CinetPay (qui peut envoyer plusieurs notifications en rafale).
app.use(
  '/api/v1/webhook',
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
  require('./routes/webhook.routes'),
);

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));           // ✅ 100mb → 10mb (sécurité)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Sanitization & logging ───────────────────────────────────────────────────
app.use(require('./middlewares/sanitize'));
// ✅ Anti HTTP Parameter Pollution (empêche ?role=customer&role=admin)
//    Whitelist des champs où la répétition est légitime (filtres listes).
app.use(hpp({
  whitelist: ['category', 'type', 'tags', 'sort', 'fields'],
}));
app.use(morgan('dev'));

// ─── Fichiers statiques ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health check (avant rate limiter global) ─────────────────────────────────
app.use('/api/v1/health', require('./routes/health.routes'));

// ─── Debug (avant rate limiter global aussi — usage ponctuel hors production) ───
// Sert à récupérer l'IP sortante du conteneur en dev/staging. Jamais exposé en prod.
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEBUG_ROUTES !== 'false') {
  app.use('/api/v1/debug', require('./routes/debug.routes'));
}

// ─── Rate limiter global ──────────────────────────────────────────────────────
app.use(apiLimiter);

// ─── Routes API ───────────────────────────────────────────────────────────────

// Auth (rate limiters stricts appliqués par route dans auth.routes.js)
// → /login, /forgot-password, /reset-password-otp : 10/15min (anti brute-force)
// → /register, /verify-email                  : 10/h (anti spam comptes)
app.use('/api/v1/auth', require('./routes/auth.routes'));

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

// ✅ Bokoma Store — communautés
app.use('/api/v1/gallery',    require('./routes/gallery.routes'));
app.use('/api/v1/feedbacks',  require('./routes/feedback.routes'));

// ✅ RGPD / Cookies — log de consentement CNIL (public + admin)
app.use('/api/v1/consent',    require('./routes/consent.routes'));

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

// 🪵 Snapshot des variables CinetPay au démarrage — visible dès les
// premières secondes dans les logs Railway. Sans valeur, juste présent/absent.
logger.info('boot', 'env_snapshot', {
  nodeEnv: process.env.NODE_ENV,
  port: PORT,
  cinetpay: {
    apiKeyPresent:      !!process.env.CINETPAY_API_KEY,
    apiPasswordPresent: !!process.env.CINETPAY_API_PASSWORD_CI,
    baseUrl:            process.env.CINETPAY_API_URL || null,
    mode:               process.env.CINETPAY_MODE     || null,
    fullyConfigured: !!(
      process.env.CINETPAY_API_KEY &&
      process.env.CINETPAY_API_PASSWORD_CI &&
      process.env.CINETPAY_API_URL
    ),
  },
  clientUrl: process.env.CLIENT_URL || null,
  apiUrl:    process.env.API_URL    || null,
});

connectDB()
  .then(() => {
    logger.info('boot', 'mongo_connected', { ok: true });
    startPaymentExpiryJob();
    startPaymentVerificationJob();
    app.listen(PORT, () => {
      logger.info('boot', 'server_listening', {
        url: `http://localhost:${PORT}`,
        health: `http://localhost:${PORT}/api/v1/health`,
      });
      // Conserver aussi les logs "console.log" pour les outils qui les grep
      console.log(`🚀 Serveur : http://localhost:${PORT}`);
      console.log(`🏥 Health  : http://localhost:${PORT}/api/v1/health`);
    });
  })
  .catch((err) => {
    logger.error('boot', 'mongo_failed', { error: err.message });
    console.error('❌ MongoDB erreur:', err.message);
    process.exit(1);
  });

module.exports = app;