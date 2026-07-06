// src/middlewares/verifyCinetPaySignature.js
// ============================================================================
// 🔐 CINETPAY WEBHOOK SIGNATURE — Vérification HMAC-SHA256
// ============================================================================
// CinetPay signe ses notifications avec HMAC-SHA256 en utilisant le mot de
// passe API comme clé secrète. La signature est envoyée dans le header
// `x-cinetpay-signature` (et le body brut dans la requête).
//
// Cette vérification doit s'appliquer AVANT tout parser JSON pour avoir
// accès au body brut. Voir src/server.js où on monte express.raw() sur
// la route webhook.
// ============================================================================

const crypto = require('crypto');
const AppError = require('../utils/AppError');

const SIGNATURE_HEADER = 'x-cinetpay-signature';
const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000; // 5 min anti-replay

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook CinetPay.
 *
 * Headers attendus :
 *   - x-cinetpay-signature: <hex hmac-sha256>
 *
 * Body attendu (JSON) :
 *   {
 *     "transaction_id": "CMD-...",
 *     "status": "ACCEPTED" | "REFUSED" | ...,
 *     "amount": 12345,
 *     "timestamp": "2024-01-15T12:34:56Z" (optionnel, recommandé)
 *   }
 *
 * @param {Object} [options]
 * @param {String} [options.secret]        - Override du secret (pour les tests)
 * @param {String} [options.signatureHeader] - Nom du header de signature
 * @param {Boolean} [options.allowInsecure] - true en dev si pas de secret configuré
 * @param {Number} [options.timestampTolerance] - Anti-replay en ms (défaut 5min)
 */
const verifyCinetPaySignature = (options = {}) => {
  const {
    secret = process.env.CINETPAY_API_PASSWORD_CI,
    signatureHeader = SIGNATURE_HEADER,
    allowInsecure = process.env.NODE_ENV !== 'production',
    timestampTolerance = DEFAULT_TOLERANCE_MS,
  } = options;

  return (req, res, next) => {
    // 1. Récupérer la signature du header
    const signature = req.headers[signatureHeader.toLowerCase()];

    if (!signature) {
      if (allowInsecure && process.env.NODE_ENV !== 'production') {
        req.webhookVerified = false;
        return next();
      }
      return next(new AppError('Signature webhook manquante', 401));
    }

    // 2. Vérifier que le secret est configuré (en prod)
    if (!secret) {
      if (allowInsecure) {
        req.webhookVerified = false;
        return next();
      }
      return next(new AppError('Configuration webhook invalide', 500));
    }

    // 3. Récupérer le body brut (capturé par express.raw() dans server.js)
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : null);
    if (!rawBody) {
      return next(new AppError('Body webhook invalide', 400));
    }

    // 4. Calculer la signature attendue
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // 5. Comparaison en temps constant
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(String(signature), 'utf8');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return next(new AppError('Signature webhook invalide', 401));
    }

    // 6. Anti-replay : vérifier le timestamp si présent dans le body parsé
    try {
      const parsed = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
        ? req.body
        : JSON.parse(rawBody.toString('utf8'));

      if (parsed?.timestamp) {
        const ts = new Date(parsed.timestamp).getTime();
        if (!isNaN(ts) && Math.abs(Date.now() - ts) > timestampTolerance) {
          return next(new AppError('Webhook expiré (anti-replay)', 401));
        }
      }
    } catch {
      // Le body parsing est de la responsabilité du middleware suivant
    }

    req.webhookVerified = true;
    next();
  };
};

module.exports = verifyCinetPaySignature;
module.exports.SIGNATURE_HEADER = SIGNATURE_HEADER;