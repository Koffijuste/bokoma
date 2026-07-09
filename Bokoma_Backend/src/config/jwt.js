// bokoma_backend/src/config/jwt.js
// ============================================================================
// 🔐 JWT CONFIGURATION CENTRALISÉE — Source unique de vérité
// ============================================================================

// Validation des variables requises au démarrage
const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Missing required JWT env vars: ${missing.join(', ')}`);
  console.error('   Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your .env file');
  process.exit(1);
}

module.exports = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET,
    // ✅ Bug fix (09/07/2026) : bumped default 1h → 24h. À 1h, l'utilisateur
    // se faisait kicker de /dashboard toutes les heures alors que le refresh
    // token (7j) était encore valide — combinée à un store Zustand persisté,
    // ça créait une boucle de redirection sur /auth/login. 24h reste
    // raisonnable côté sécurité (le refreshToken peut révoquer côté DB).
    // Override via JWT_ACCESS_EXPIRES_IN si tu veux tuner.
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'bokoma-api',
    audience: process.env.JWT_AUDIENCE || 'bokoma-users',
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'bokoma-api',
    audience: process.env.JWT_AUDIENCE || 'bokoma-users',
  },
  options: {
    algorithm: 'HS256',
  },
};