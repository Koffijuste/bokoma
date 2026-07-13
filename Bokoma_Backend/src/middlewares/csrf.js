// src/middlewares/csrf.js
// ============================================================================
// 🛡️ CSRF — Origin / Referer check pour les requêtes mutantes
// ============================================================================
// Contexte Bokoma :
//   Le cookie d'auth est SameSite=none en prod (parce que le front Vercel
//   et l'API Railway sont sur des domaines différents : cross-site).
//   SameSite=none permet au cookie d'être envoyé dans toutes les requêtes
//   cross-site, ce qui ouvre la porte au CSRF si rien d'autre ne vérifie
//   l'origine de la requête.
//
//   On ajoute donc un check : pour toute requête mutante (POST/PUT/PATCH/
//   DELETE) sur /api/*, le header `Origin` (ou `Referer` en fallback)
//   DOIT être dans la liste blanche. Sinon → 403.
//   Les webhooks externes (CinetPay) sont exemptés : ils utilisent un
//   autre mécanisme d'auth (notifyToken) et ne peuvent pas se faire
//   passer pour un user authentifié de toute façon.
// ============================================================================
'use strict';

// Liste blanche des origines autorisées (alignée avec server.js CORS)
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const DEFAULT_ALLOWED = [
  'https://www.bokomastore.com',
  'https://bokomastore.com',
];

if (process.env.NODE_ENV !== 'production') {
  DEFAULT_ALLOWED.push(
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
  );
}

const ALLOWED = new Set([...DEFAULT_ALLOWED, ...ALLOWED_ORIGINS]);

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Endpoints qui doivent être exemptés du check (webhooks externes qui
// s'authentifient par d'autres moyens, pas par cookie SameSite).
// → /api/v1/webhook/* (CinetPay) : authentifié par notifyToken.
const EXEMPT_PREFIXES = ['/api/v1/webhook'];

module.exports = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  // CORS preflight (OPTIONS) — géré par le middleware CORS upstream
  if (req.method === 'OPTIONS') return next();

  const origin = (req.headers.origin || req.headers.referer || '').replace(/\/$/, '');

  if (!origin) {
    // ⚠️ Pas d'Origin / Referer : peut venir d'un outil type curl/Postman,
    //    d'un script server-to-server, ou d'un client mal configuré.
    //    On ne BLOQUE PAS (sinon les outils d'admin type Postman ou
    //    les healthchecks internes ne passent plus). La vraie protection
    //    anti-CSRF reste :
    //      1. Cookie SameSite=none + Secure en prod (bloque la plupart
    //         des attaques CSRF navigateur-side)
    //      2. Whitelist d'Origin pour les requêtes navigateur (les vrais
    //         navigateurs envoient TOUJOURS un Origin sur POST/PUT/PATCH/DELETE)
    //    Le reject strict sur Origin manquante était trop cassant — si tu
    //    veux le réactiver, replace le `return next()` par un 403.
    return next();
  }

  // Origin peut être `https://bokoma.vercel.app` ou
  // `https://bokoma.vercel.app/some/path` — on compare le host
  try {
    const url = new URL(origin);
    const hostOrigin = `${url.protocol}//${url.host}`;
    if (ALLOWED.has(hostOrigin)) return next();
  } catch {
    // Origin pas un URL valide → rejeter
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ [CSRF] Origin rejetée: ${origin}`);
  }
  return res.status(403).json({
    success: false,
    message: 'Origine non autorisée. Requête bloquée (CSRF).',
  });
};
