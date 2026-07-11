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

// ─── Webhook CinetPay ──────────────────────────────────────────────────────────
// Le webhook s'authentifie par `notifyToken` (API CinetPay v1), pas par HMAC.
// On le monte AVANT le rate limiter global pour ne pas être étranglé par
// apiLimiter (CinetPay peut envoyer plusieurs notifications en rafale).
// IMPORTANT : express.json() doit être monté ici pour que req.body soit parsé
// (sinon parseNotification du SDK reçoit undefined et throw "Payload invalide").
app.use(
  '/api/v1/webhook',
  express.json({ limit: '1mb' }),
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
// 🛡️ H5 (audit Bokoma 11/07/2026) : anti-CSRF via Origin check.
//    Le cookie d'auth est SameSite=none en prod (front Vercel ≠ API Railway),
//    donc on vérifie manuellement que les requêtes mutantes (POST/PUT/PATCH/
//    DELETE) proviennent bien d'un front autorisé. Bloque les attaques CSRF
//    classiques (form action sur un site tiers qui soumet vers notre API).
app.use(require('./middlewares/csrf'));
app.use(morgan('dev'));

// ─── Fichiers statiques ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health check (avant rate limiter global) ─────────────────────────────────
app.use('/api/v1/health', require('./routes/health.routes'));

// ─── Debug — admin-only via middleware (defense in depth) ────────────────────
// Sert à récupérer l'IP sortante du conteneur (utile en prod pour whitelister
// CinetPay). La protection n'est PLUS basée sur NODE_ENV (sinon l'admin n'y
// aurait plus accès en prod, ce qui est précisément le besoin). À la place :
//   - Auth + RBAC appliqués directement dans debug.routes.js (protect + restrictTo('admin'))
//   - ENABLE_DEBUG_ROUTES=false agit comme kill switch d'urgence
//   - debugLimiter (20/15min) bloque les scans
// On garde le montage AVANT le rate limiter global pour ne pas être étranglé
// par apiLimiter sur des hits ponctuels de diagnostic.
// ✅ Bug fix (10/07/2026) : on monte la route /api/v1/debug/* en dur
// (sans kill switch d'env var). La protection reste 3 couches :
//   1. debugLimiter     → anti brute-force / scan
//   2. protect          → JWT valide, charge req.user
//   3. restrictTo('admin') → refuse tout rôle ≠ admin
// L'env var ENABLE_DEBUG_ROUTES est ignorée : le seul kill switch
// est maintenant l'auth + le RBAC (defense in depth). Si tu veux
// vraiment désactiver les routes debug, supprime ce bloc.
app.use('/api/v1/debug', require('./routes/debug.routes'));

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

// 🔔 Web Push (PWA) — gestion des abonnements notifications
app.use('/api/v1/push',       require('./routes/push.routes'));

// ✅ RGPD / Cookies — log de consentement CNIL (public + admin)
app.use('/api/v1/consent',    require('./routes/consent.routes'));

// ─── 404 ──────────────────────────────────────────────────────────────────────
// 🔒 On ne RÉVÈLE PAS le path demandé dans la réponse (info disclosure :
// permet à un attaquant de confirmer l'existence de routes privées).
//   AVANT : "Route non trouvée: /api/auth/reset-password"
//   APRÈS : "Not found"
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
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

      // ✅ Log l'IP sortante du conteneur Railway au démarrage.
      //    Sert à whitelister CinetPay sans avoir à interroger /api/v1/debug/ip.
      //    Best-effort : ne bloque pas le boot si l'echo service est down.
      if (process.env.NODE_ENV === 'production') {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 3000);
        fetch('https://api.ipify.org?format=json', {
          signal: ctl.signal,
          headers: { Accept: 'application/json' },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => {
            clearTimeout(t);
            const egressIp = j?.ip || null;
            logger.info('boot', 'railway_egress_ip', {
              egressIp,
              cinetpayWhitelistHint: egressIp
                ? `Ajoute ${egressIp} à la whitelist CinetPay (https://app-new.cinetpay.com → Intégrations)`
                : 'IP non détectée — utilise GET /api/v1/debug/ip pour la récupérer',
            });
            console.log(`🌐 Egress IP Railway : ${egressIp || 'indéterminée'}`);
          })
          .catch(() => clearTimeout(t));
      }
    });
  })
  .catch((err) => {
    logger.error('boot', 'mongo_failed', { error: err.message });
    console.error('❌ MongoDB erreur:', err.message);
    process.exit(1);
  });

module.exports = app;