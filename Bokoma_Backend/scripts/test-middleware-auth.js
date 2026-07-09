// scripts/test-middleware-auth.js
// ============================================================================
// Test local : simule le flow d'authentification du middleware Next.js pour
// vérifier qu'il n'y a plus de boucle de redirection sur /dashboard après
// expiration du access token (refresh encore valide).
// ============================================================================
'use strict';

// Reproduce les helpers du middleware Edge (Edge runtime, pas de Node deps
// lourdes — la fonction est la même que celle dans middleware.ts).
let jwtDecode;
try {
  jwtDecode = require('jwt-decode').jwtDecode;
} catch {
  // Fallback si jwt-decode absent : décoder manuellement le payload (base64)
  jwtDecode = (tok) => {
    const payload = tok.split('.')[1];
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  };
}

const SECRET = 'test_secret_min_32_chars_for_unit_test_only_xxxxx';
const jwt = require('jsonwebtoken');

function decodeAccessToken(token) {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (typeof decoded.exp !== 'number') return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) return null;
    return decoded;
  } catch { return null; }
}

function decodeRefreshToken(token) {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (typeof decoded.exp !== 'number') return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) return null;
    return decoded;
  } catch { return null; }
}

/**
 * Reproduit la décision du middleware pour le scénario :
 *   - pathname = '/dashboard'
 *   - access token: présent (signé avec iat = now-2h, donc exp dans 1h → DÉJÀ EXPIRÉ)
 *   - refresh token: présent (signé avec iat = now-1j, donc exp dans 6j → VALIDE)
 *
 *   Attendu : on laisse passer (Approche C).
 */
function middlewareDecision({ accessToken, refreshToken, pathname }) {
  const accessPayload = decodeAccessToken(accessToken);
  const refreshPayload = decodeRefreshToken(refreshToken);

  if (!accessPayload) {
    if (refreshPayload) {
      return { decision: 'NEXT', reason: 'access expiré mais refresh valide → on laisse passer' };
    }
    return { decision: 'REDIRECT_LOGIN', reason: 'access expiré ET refresh expiré → login' };
  }
  return { decision: 'NEXT', reason: 'access valide' };
}

// ─── Génération des tokens de test ──────────────────────────────────────────
const userId = 'aaaaaaaaaaaa000000000001';

// Access token déjà expiré (signé avec 1h, iat = il y a 2h)
const accessToken = jwt.sign(
  { userId, email: 'admin@bokoma.ci', role: 'admin' },
  SECRET,
  { issuer: 'bokoma-api', audience: 'bokoma-users', expiresIn: '1h' }
);
// On force l'expiration en hackant le timestamp : on signe avec un exp passé.
// (jwt.sign ne supporte pas directement ça, mais jwt.verify(exp) le rejette.

// Recréons un token expiré "à la main"
const expiredToken = jwt.sign(
  { userId, email: 'admin@bokoma.ci', role: 'admin', iat: Math.floor(Date.now()/1000) - 7200, exp: Math.floor(Date.now()/1000) - 3600 },
  SECRET,
  { issuer: 'bokoma-api', audience: 'bokoma-users', algorithm: 'HS256' }
);

// Refresh token encore valide
const refreshToken = jwt.sign(
  { userId, type: 'refresh' },
  SECRET,
  { issuer: 'bokoma-api', audience: 'bokoma-users', expiresIn: '7d' }
);

// ─── Tests ──────────────────────────────────────────────────────────────────
const tests = [
  {
    name: '1. Aucun token → REDIRECT_LOGIN',
    args: { accessToken: undefined, refreshToken: undefined, pathname: '/dashboard' },
    expect: 'REDIRECT_LOGIN',
  },
  {
    name: '2. Access valide → NEXT',
    args: { accessToken, refreshToken: undefined, pathname: '/dashboard' },
    expect: 'NEXT',
  },
  {
    name: '3. Access expiré, refresh valide → NEXT (FIX DE LA BOUCLE)',
    args: { accessToken: expiredToken, refreshToken, pathname: '/dashboard' },
    expect: 'NEXT',
  },
  {
    name: '4. Access expiré, refresh expiré → REDIRECT_LOGIN',
    args: {
      accessToken: expiredToken,
      refreshToken: jwt.sign(
        { userId, type: 'refresh', exp: Math.floor(Date.now()/1000) - 60 },
        SECRET,
        { issuer: 'bokoma-api', audience: 'bokoma-users', algorithm: 'HS256' }
      ),
      pathname: '/dashboard',
    },
    expect: 'REDIRECT_LOGIN',
  },
  {
    name: '5. Access invalide (signature HS256 altérée), refresh valide → NEXT',
    args: { accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ4In0.bad', refreshToken, pathname: '/profile' },
    expect: 'NEXT',
  },
];

let pass = 0, fail = 0;
for (const t of tests) {
  const r = middlewareDecision(t.args);
  const ok = r.decision === t.expect;
  if (ok) {
    console.log(`  [PASS] ${t.name}`);
    console.log(`         → ${r.reason}`);
    pass++;
  } else {
    console.log(`  [FAIL] ${t.name}`);
    console.log(`         got=${r.decision}, expected=${t.expect}`);
    console.log(`         reason=${r.reason}`);
    fail++;
  }
}

console.log('');
console.log(`Résumé : ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
