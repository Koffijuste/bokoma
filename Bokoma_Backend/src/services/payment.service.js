// src/services/payment.service.js
// ============================================================================
// 💳 CINETPAY SERVICE — Wrapper fin autour du SDK officiel `cinetpay-js`
// ============================================================================
// ⚠️  RÉÉCRIT POUR CORRIGER L'ERREUR `1002 / INVALID_TOKEN` SUR RAILWAY.
//
// L'ancienne version parlait directement à `POST /v1/payment` en envoyant
// `apikey` + `password` dans le payload. Or, depuis l'API v1 moderne de
// CinetPay, cet endpoint exige un **token JWT Bearer** envoyé dans le header
// `Authorization`. Pour obtenir ce token, il faut d'abord appeler
//   POST /v1/oauth/login  (api_key + api_password)
// puis utiliser `access_token` sur chaque appel `POST /v1/payment` (TTL ~24h,
// auto-refresh). La lib officielle `cinetpay-js` (cinetpay/cinetpay-js) gère
// tout : OAuth, cache token, retry sur EXPIRED_TOKEN (1003), validation des
// payloads, détection sandbox/prod depuis le préfixe de la clé.
//
// Cette refacto CONSERVE LA MÊME SIGNATURE PUBLIQUE pour ne rien casser :
//   - isConfigured()
//   - initializePayment({ transactionId, amount, description, customer,
//     orderId, payment_method })
//       → { success, paymentToken, paymentUrl, transactionId,
//           notifyToken, _correlationId }
//   - verifyPayment(transactionId)
//       → { success, status, amount, transactionId }
//   - authenticate() / getAccessToken()  (shims rétro-compat)
//
// Le contrat `throws AppError` est également préservé pour que les callers
// (order.service, payment-flow.service, webhook, jobs, controller) gardent
// leur comportement de log/rollback actuel.
// ============================================================================

const crypto = require('crypto');
const {
  CinetPayClient,
  CinetPayError,
  ApiError,
  AuthenticationError,
  NetworkError,
  TimeoutError,
  ValidationError,
} = require('cinetpay-js');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.apiKey      = process.env.CINETPAY_API_KEY;
    this.apiPassword = process.env.CINETPAY_API_PASSWORD_CI;
    // 🇬🇼 Pays actif : on ne couvre que la Côte d'Ivoire pour l'instant.
    // Pour ajouter un pays (SN, CM…) il suffira de lire les variables
    // CINETPAY_API_PASSWORD_<PAYS> correspondantes et d'enregistrer le pays
    // dans `clientCredentials` ci-dessous.
    this.country     = 'CI';
    this.clientUrl   = process.env.CLIENT_URL  || 'http://localhost:3000';
    this.apiUrl      = process.env.API_URL     || this.clientUrl;
    // CINETPAY_API_URL peut surcharger l'auto-détection du SDK. Vide = auto.
    this.baseUrl     = (process.env.CINETPAY_API_URL || '').replace(/\/+$/, '') || undefined;
    this.mode        = process.env.CINETPAY_MODE  || 'sandbox';

    // Client SDK paresseusement instancié — ne pas planter à l'import si
    // les variables d'env manquent (le backend doit pouvoir démarrer pour
    // servir les routes non-paiement même si CinetPay est mal configuré).
    this._sdk = null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  CONFIG / HELPERS
  // ───────────────────────────────────────────────────────────────────────────

  isConfigured() {
    const missing = [];
    if (!this.apiKey)      missing.push('CINETPAY_API_KEY');
    if (!this.apiPassword) missing.push('CINETPAY_API_PASSWORD_CI');
    if (missing.length > 0) {
      logger.error('payment', 'missing_env', {
        missing,
        hint: 'Set these on Railway → Service backend → Variables, then redeploy.',
      });
      return false;
    }
    return true;
  }

  _newCorrelationId() {
    return 'cp-' + crypto.randomBytes(6).toString('hex');
  }

  /**
   * Crée le client SDK une fois pour toutes et le cache. On lui injecte notre
   * logger structuré via l'interface Logger du SDK (3 méthodes : debug/warn/error)
   * pour centraliser les logs et garder une trace grep-friendly côté Railway.
   */
  _getClient() {
    if (this._sdk) return this._sdk;
    const sdkLogger = {
      debug: (msg, data) => logger.debug('cinetpay-sdk', msg, data || {}),
      warn:  (msg, data) => logger.warn('cinetpay-sdk', msg, data || {}),
      error: (msg, data) => logger.error('cinetpay-sdk', msg, data || {}),
    };

    const config = {
      credentials: {
        [this.country]: { apiKey: this.apiKey, apiPassword: this.apiPassword },
      },
      logger: sdkLogger,
      // tokenTtl par défaut = 82800s (23h, marge sous les ~24h renvoyées par
      // l'API). retry sur EXPIRED_TOKEN (1003) géré en interne par le SDK.
    };

    if (this.baseUrl) config.baseUrl = this.baseUrl;

    this._sdk = new CinetPayClient(config);
    return this._sdk;
  }

  /**
   * Détecte une erreur CinetPay "IP not whitelisted" (apiCode 2011) et,
   * si oui, récupère l'IP sortante de Railway via un service d'echo IP public
   * pour faciliter le diagnostic côté ops : l'user n'a qu'à copier l'IP du
   * log et la coller dans la whitelist du dashboard CinetPay.
   *
   * @returns {Promise<{ isWhitelistError: boolean, egressIp: string|null,
   *                     description: string }>}
   */
  async _diagnoseIpWhitelistError(err) {
    const description = err?.description || err?.cause?.description || '';
    const isWhitelistError =
      /ip\s*(is\s*)?(not\s*)?(with)?listed/i.test(description) ||
      err?.apiCode === 2011 ||
      String(err?.apiStatus || '').toUpperCase() === 'NOT_ALLOWED';

    if (!isWhitelistError) {
      return { isWhitelistError: false, egressIp: null, description };
    }

    let egressIp = null;
    try {
      // ipify est gratuit, pas de clé, et largement suffisant pour un diagnostic.
      // On l'appelle avec un AbortController de 3s pour ne pas bloquer le flow
      // si l'echo service est down — l'erreur principale (paiement refusé)
      // reste prioritaire.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const r = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);
      if (r.ok) egressIp = (await r.json())?.ip || null;
    } catch {
      // best-effort — on continue sans IP si l'echo a planté
    }

    return { isWhitelistError: true, egressIp, description };
  }

  /**
   * Convertit une erreur du SDK en AppError, en gardant `err.cause` chaîné
   * pour le diagnostic Railway (logs.error dans order.service lit cause.*).
   *
   * Cas particulier : erreur de WHITELIST IP (apiCode 2011). On log alors
   * l'IP sortante à whitelister côté dashboard CinetPay + l'URL du dashboard,
   * pour que l'équipe ops sache exactement quoi faire.
   */
  async _wrapSdkError(err, defaultStatus, correlationId) {
    let status = defaultStatus;
    let message = err?.message || 'Erreur CinetPay inconnue';

    if (err instanceof AuthenticationError) {
      status = 500;
      message = `Identifiants CinetPay invalides: ${message}`;
    } else if (err instanceof ApiError) {
      status = 400;
      message = err.description || err.message || message;
    } else if (err instanceof TimeoutError) {
      status = 504;
      message = `CinetPay timeout: ${message}`;
    } else if (err instanceof NetworkError) {
      status = 502;
      message = `CinetPay réseau injoignable: ${message}`;
    } else if (err instanceof ValidationError) {
      status = 400;
      message = `Données de paiement invalides: ${message}`;
    } else if (err instanceof CinetPayError) {
      status = 502;
    }

    // 🩺 Diagnostic spécial : IP sortante non whitelistée
    const diag = await this._diagnoseIpWhitelistError(err);
    if (diag.isWhitelistError) {
      logger.error('payment', 'ip_not_whitelisted', {
        correlationId,
        egressIp: diag.egressIp,
        description: diag.description,
        fixUrl: 'https://app-new.cinetpay.com/login → Intégrations → modifier la clé API → "Adresses IP autorisées"',
        hint: diag.egressIp
          ? `Ajoute l'IP ${diag.egressIp} à la whitelist puis redéploie (ou redémarre le service pour vider le cache token).`
          : "Récupère l'IP sortante Railway (depuis n'importe quel endpoint qui fait un `curl api.ipify.org`) et ajoute-la à la whitelist CinetPay.",
      });
      message = diag.egressIp
        ? `IP sortante Railway (${diag.egressIp}) non autorisée par CinetPay. Ajoute-la à la whitelist de ta clé API sur le dashboard CinetPay, puis redéploie.`
        : `IP sortante non whitelistée chez CinetPay. Ajoute l'IP publique Railway à la whitelist sur le dashboard CinetPay, puis redéploie.`;
    }

    const wrapped = new AppError(message, status, err);
    wrapped._correlationId = correlationId;
    wrapped._egressIp = diag.isWhitelistError ? diag.egressIp : undefined;
    return wrapped;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  INIT PAYMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Initialise une transaction CinetPay (init → URL de paiement → redirect).
   *
   * @param {object}  params
   * @param {string}  params.transactionId  - ID interne (≤30 chars, généré avant)
   * @param {number}  params.amount         - Montant en FCFA
   * @param {string}  params.description    - Description affichée au client
   * @param {object}  params.customer       - { name, surname, email, phone }
   * @param {string}  [params.orderId]      - ID Mongo de la commande
   * @param {string}  [params.payment_method] - 'OM_CI' | 'MTN_CI' | 'WAVE_CI' …
   *
   * @returns {Promise<{ success, paymentToken, paymentUrl, transactionId,
   *                     notifyToken, _correlationId }>}
   * @throws  {AppError} (cause = erreur SDK d'origine)
   */
  async initializePayment({
    transactionId,
    amount,
    description,
    customer,
    orderId,
    payment_method = 'OM_CI',
  }) {
    const correlationId = this._newCorrelationId();

    // Garde-fou env
    if (!this.isConfigured()) {
      throw new AppError('CinetPay non configuré (variables d\'env manquantes)', 500);
    }

    // CinetPay attend des montants >= 100 XOF et multiples de 5
    const safeAmount = Math.max(100, Math.round(Number(amount) / 5) * 5);

    const successUrl = `${this.clientUrl}/payment/success?orderId=${orderId}`;
    const failedUrl  = `${this.clientUrl}/payment/echec?orderId=${orderId}`;
    const notifyUrl  = `${this.apiUrl}/api/v1/webhook/cinetpay`;

    // 🔎 On logge ce qu'on s'apprête à faire pour pouvoir grepper côté Railway
    logger.info('payment', 'init_start', {
      correlationId,
      transactionId,
      orderId,
      amount: safeAmount,
      payment_method,
      mode: this.mode,
      endpoint: this.baseUrl ? `${this.baseUrl}/v1/payment` : 'https://api.cinetpay.net/v1/payment (auto)',
      apiKeyPresent: !!this.apiKey,
      apiPasswordPresent: !!this.apiPassword,
      viaSdk: 'cinetpay-js',
    });

    try {
      const client = this._getClient();
      const payment = await client.payment.initialize(
        {
          currency: 'XOF',
          merchantTransactionId: transactionId,
          amount: safeAmount,
          lang: 'fr',
          designation: (description || `Commande ${transactionId}`).slice(0, 255),
          clientEmail:      customer?.email || 'client@bokoma.ci',
          clientFirstName:  String(customer?.name    || 'Client').slice(0, 100),
          clientLastName:   String(customer?.surname || 'Bokoma').slice(0, 100),
          clientPhoneNumber: customer?.phone || '+2250707070707',
          successUrl,
          failedUrl,
          notifyUrl,
          channel: 'PUSH',  // SDK v1: 'PUSH' | 'OTP' | 'QRCODE'
          // paymentMethod est facultatif dans le SDK v1 ; s'il est fourni on le
          // passe pour forcer un opérateur (OM_CI, MTN_CI, WAVE_CI, …).
          ...(payment_method ? { paymentMethod: payment_method } : {}),
        },
        this.country,
      );

      logger.info('payment', 'init_ok', {
        correlationId,
        transactionId,
        orderId,
        paymentTokenPresent: !!payment.paymentToken,
        paymentUrlPresent: !!payment.paymentUrl,
        mustBeRedirected: payment.details?.mustBeRedirected,
        apiCode: payment.code,
        apiStatus: payment.status,
        cinetpayTransactionId: payment.transactionId,
      });

      return {
        success: true,
        paymentToken: payment.paymentToken,
        paymentUrl:   payment.paymentUrl,
        transactionId: payment.transactionId,
        notifyToken:  payment.notifyToken,
        _correlationId: correlationId,
      };
    } catch (err) {
      logger.error('payment', 'init_failed', {
        correlationId,
        transactionId,
        orderId,
        errorClass: err?.constructor?.name,
        message: err?.message,
        description: err?.description,
        apiCode: err instanceof ApiError ? err.apiCode : undefined,
        apiStatus: err instanceof ApiError ? err.apiStatus : undefined,
      });
      throw await this._wrapSdkError(err, 400, correlationId);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  VERIFY
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Vérifie le statut d'une transaction existante.
   * Tente d'abord via `transaction_id`, fallback sur l'identifiant tel quel.
   *
   * @returns {Promise<{ success, status, amount, transactionId, error? }>}
   *   - status ∈ SUCCESS | FAILED | REFUSED | EXPIRED | CANCELED |
     INSUFFICIENT_BALANCE | PENDING | INITIATED | UNKNOWN | ERROR
   */
  async verifyPayment(transactionId) {
    const correlationId = this._newCorrelationId();

    if (!this.isConfigured()) {
      throw new AppError('CinetPay non configuré', 500);
    }

    try {
      const client = this._getClient();
      const status = await client.payment.getStatus(transactionId, this.country);

      const apiStatus = String(status.status || '').toUpperCase();
      const ok       = apiStatus === 'SUCCESS';
      const failed   = ['FAILED', 'REFUSED', 'EXPIRED', 'CANCELED', 'INSUFFICIENT_BALANCE'].includes(apiStatus);
      const pending  = ['PENDING', 'INITIATED'].includes(apiStatus);

      const mappedStatus = ok
        ? 'SUCCESS'
        : failed
          ? apiStatus
          : pending
            ? 'PENDING'
            : apiStatus || 'UNKNOWN';

      logger.info('payment', ok ? 'verify_ok' : failed ? 'verify_failed' : 'verify_pending', {
        correlationId,
        transactionId,
        apiCode: status.code,
        apiStatus,
      });

      return {
        success: ok,
        status: mappedStatus,
        amount: undefined, // PaymentStatus ne contient pas le montant → les callers
                           // fallback déjà sur order.total
        transactionId: status.transactionId || transactionId,
      };
    } catch (err) {
      logger.error('payment', 'verify_error', {
        correlationId,
        transactionId,
        errorClass: err?.constructor?.name,
        message: err?.message,
        apiCode: err instanceof ApiError ? err.apiCode : undefined,
      });

      // Forme attendue par les callers (webhook, jobs, controller)
      return {
        success: false,
        status: 'ERROR',
        error: err?.message || 'Erreur inconnue',
        transactionId,
      };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  COMPAT RETRO — shims pour ne pas casser d'anciens imports
  //  (test.cinetpay.routes.js, scripts, etc.)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * ⚠️ DEPRECATED — conservé en shim pour ne pas péter les routes de test.
   * Avec cinetpay-js, il n'y a PAS de token "exposé" : l'Authenticator du SDK
   * gère son cache JWT en interne. On log un warning si quelqu'un appelle.
   */
  async authenticate() {
    logger.warn('payment', 'auth_called_but_deprecated', {
      hint: 'Avec cinetpay-js, l\'authentification est gérée en interne (POST /v1/oauth/login + cache JWT du SDK). Aucun token à manipuler.',
    });
    return 'use-sdk-internal-auth';
  }

  async getAccessToken() {
    return 'use-sdk-internal-auth';
  }

  /** Permet aux tests / à la console de vérifier que le client est bien construit. */
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, error: 'CinetPay non configuré' };
    }
    try {
      const client = this._getClient();
      // Juste demander un token — c'est l'opération la plus simple pour
      // vérifier que api_key + api_password sont valides.
      const clientWithAuth = client.authenticators?.get(this.country);
      if (!clientWithAuth) return { success: false, error: 'Authenticator absent' };
      await clientWithAuth.getToken();
      return { success: true, message: 'Connexion à CinetPay établie', mode: this.mode };
    } catch (err) {
      return { success: false, error: err?.message || 'Erreur inconnue' };
    }
  }
}

module.exports = new PaymentService();
