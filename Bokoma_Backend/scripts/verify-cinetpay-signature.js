// scripts/verify-cinetpay-signature.js
// ============================================================================
// 🔐 Vérifie isolément la logique de signature CinetPay
//    (sans Jest, sans MongoDB — test direct du middleware)
// ============================================================================

const crypto = require('crypto');

// Charge le vrai middleware utilisé par le backend
const verifyCinetPaySignature = require('../src/middlewares/verifyCinetPaySignature');

const SECRET = process.env.CINETPAY_API_PASSWORD_CI || 'test-webhook-secret-abc123';

let pass = 0;
let fail = 0;

function check(name, cond, details = '') {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}  ${details}`);
  }
}

function buildReq({ body, signature, signatureHeader = 'x-cinetpay-signature' } = {}) {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const buf = Buffer.from(bodyStr);
  const headers = {};
  if (signature !== undefined) headers[signatureHeader] = signature;
  return {
    headers,
    rawBody: buf,
    body: JSON.parse(bodyStr),
  };
}

function run(middleware, req) {
  const res = {
    status: () => res,
    json:  () => res,
  };
  let nextErr;
  const next = (err) => { nextErr = err; };
  middleware(req, res, next);
  return { nextErr, req };
}

console.log('\n🔐 Tests signature CinetPay (SECRET = "' + SECRET + '")\n');

// ─── 1. Signature valide → next() sans erreur ─────────────────────────────
{
  const body = { transaction_id: 'CMD-001', status: 'ACCEPTED', timestamp: new Date().toISOString() };
  const bodyStr = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', SECRET).update(bodyStr).digest('hex');

  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const { nextErr, req } = run(mw, buildReq({ body, signature: sig }));
  check('1. signature valide passe (next sans erreur)', !nextErr, nextErr?.message);
  check('   req.webhookVerified === true', req.webhookVerified === true);
}

// ─── 2. Mauvaise signature → AppError 401 ────────────────────────────────
{
  const body = { transaction_id: 'CMD-002', status: 'ACCEPTED' };
  const bodyStr = JSON.stringify(body);
  const wrongSig = crypto.createHmac('sha256', 'OTHER-SECRET').update(bodyStr).digest('hex');

  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const { nextErr } = run(mw, buildReq({ body, signature: wrongSig }));
  check('2. mauvaise signature rejetée en 401', nextErr?.statusCode === 401,
    `→ reçu: ${nextErr?.statusCode} ${nextErr?.message}`);
}

// ─── 3. Signature manquante en mode strict → 401 ─────────────────────────
{
  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const { nextErr } = run(mw, buildReq({ body: { transaction_id: 'CMD-003' } }));
  check('3. signature absente en strict → 401', nextErr?.statusCode === 401);
}

// ─── 4. Signature manquante en mode dev → next() OK, webhookVerified=false
{
  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: true });
  const { nextErr, req } = run(mw, buildReq({ body: { transaction_id: 'CMD-004' } }));
  check('4. signature absente en dev → autorisé', !nextErr);
  check('   req.webhookVerified === false (non vérifié)', req.webhookVerified === false);
}

// ─── 5. Secret non configuré en prod → 500 ───────────────────────────────
{
  const mw = verifyCinetPaySignature({ secret: null, allowInsecure: false });
  const { nextErr } = run(mw, buildReq({ body: { foo: 'bar' }, signature: 'abc' }));
  check('5. secret null en prod → 500', nextErr?.statusCode === 500);
}

// ─── 6. Secret non configuré en dev → autorisé ───────────────────────────
{
  const mw = verifyCinetPaySignature({ secret: null, allowInsecure: true });
  const { nextErr, req } = run(mw, buildReq({ body: { foo: 'bar' }, signature: 'abc' }));
  check('6. secret null en dev → autorisé', !nextErr);
}

// ─── 7. rawBody manquant → 400 ───────────────────────────────────────────
{
  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const req = { headers: { 'x-cinetpay-signature': 'x' }, rawBody: null };
  const { nextErr } = run(mw, req);
  check('7. rawBody manquant → 400', nextErr?.statusCode === 400);
}

// ─── 8. Longueurs de signature différentes → 401 ─────────────────────────
{
  const body = JSON.stringify({ transaction_id: 'CMD-008' });
  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const { nextErr } = run(mw, buildReq({ body, signature: 'short' }));
  check('8. signature trop courte → 401', nextErr?.statusCode === 401);
}

// ─── 9. Anti-replay : timestamp > 5 min → rejeté ─────────────────────────
{
  const oldTs = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const body = { transaction_id: 'CMD-009', timestamp: oldTs };
  const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');
  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const { nextErr } = run(mw, buildReq({ body, signature: sig }));
  check('9. timestamp > 5 min → 401 (anti-replay)', nextErr?.statusCode === 401);
}

// ─── 10. Anti-replay : timestamp récent → OK ─────────────────────────────
{
  const freshTs = new Date().toISOString();
  const body = { transaction_id: 'CMD-010', timestamp: freshTs };
  const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');
  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const { nextErr } = run(mw, buildReq({ body, signature: sig }));
  check('10. timestamp récent → OK', !nextErr);
}

// ─── 11. Sans timestamp → OK (optionnel) ─────────────────────────────────
{
  const body = { transaction_id: 'CMD-011' };
  const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');
  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const { nextErr } = run(mw, buildReq({ body, signature: sig }));
  check('11. sans timestamp → OK', !nextErr);
}

// ─── 12. Vérif end-to-end : mode prod simulé (allowInsecure=false + secret OK)
{
  process.env.NODE_ENV = 'production';
  const body = { transaction_id: 'CMD-012', status: 'SUCCESS', timestamp: new Date().toISOString() };
  const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');
  // Réinitialise le middleware pour relire NODE_ENV (allowInsecure par défaut)
  const mw = verifyCinetPaySignature({ secret: SECRET });
  const { nextErr, req } = run(mw, buildReq({ body, signature: sig }));
  process.env.NODE_ENV = 'test';
  check('12. prod + sig valide → accepté', !nextErr);
  check('   req.webhookVerified === true', req.webhookVerified === true);
}

// ─── 13. Vérifier que ce que CinetPay enverrait matche notre calcul ──────
console.log('\n🔬 Sanity-check : calcul HMAC conforme à ce que les tests attendent');
{
  const body = { transaction_id: 'CMD-013', status: 'ACCEPTED', amount: 5000 };
  const bodyStr = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', SECRET).update(bodyStr).digest('hex');
  const mw = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
  const { nextErr } = run(mw, buildReq({ body, signature: sig }));
  check('13. sig HMAC-SHA256(secret, body) calculée localement → vérifiée par le middleware',
    !nextErr, nextErr?.message);
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Résultat : ${pass} ✅ / ${fail} ❌`);
console.log(`${'─'.repeat(60)}\n`);

process.exit(fail === 0 ? 0 : 1);
