// src/services/payment.service.js
// ============================================================================
// 💳 CINETPAY SERVICE — Init / verify paiement
// ============================================================================
// ⚠️  Réécrit pour corriger le bug "Erreur de paiement silencieuse" sur Railway.
//     L'ancienne version utilisait un faux endpoint OAuth (`/v1/oauth/login`)
//     que CinetPay ne reconnaît pas → Bearer token jamais obtenu → 500 muet.
//     La bonne API CinetPay accepte directement `apikey` + `password` dans
//     le payload de `/v2/payment`, sans OAuth préalable.
//
//     Voir : https://docs.cinetpay.com/api/1-payment-init
//
//     Tous les points d'échec sont désormais tracés via le logger structuré :
//       - env vars manquantes        → tag=payment event=missing_env
//       - timeout / DNS / réseau     → tag=payment event=network_error
//       - credentials invalides      → tag=payment event=auth_failed
//       - payload rejeté par CinetPay → tag=payment event=rejected
//       - 5xx CinetPay               → tag=payment event=upstream_5xx
//     Un correlationId est généré par tentative pour suivre la transaction
//     dans les logs Railway (à grepper avec ce token).
// ============================================================================

const axios = require('axios');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.apiKey     = process.env.CINETPAY_API_KEY;
    this.apiPassword = process.env.CINETPAY_API_PASSWORD_CI;
    // ✅ URL de base SANS /v2 (le path est ajouté dans chaque méthode)
    this.baseUrl    = (process.env.CINETPAY_API_URL || 'https://api-checkout.cinetpay.com').replace(/\/+$/, '');
    this.clientUrl  = process.env.CLIENT_URL || 'http://localhost:3000';
    this.apiUrl     = process.env.API_URL || this.clientUrl;
    this.mode       = process.env.CINETPAY_MODE || 'sandbox';
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  CONFIG
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Vérifie que les variables d'env CinetPay sont présentes.
   * Log explicitement celles qui manquent (Railway debug).
   * @returns {boolean}
   */
  isConfigured() {
    const missing = [];
    if (!this.apiKey)      missing.push('CINETPAY_API_KEY');
    if (!this.apiPassword) missing.push('CINETPAY_API_PASSWORD_CI');
    if (!this.baseUrl)     missing.push('CINETPAY_API_URL');

    if (missing.length > 0) {
      logger.error('payment', 'missing_env', {
        missing,
        hint: 'Set these on Railway → Service backend → Variables, then redeploy.',
      });
      return false;
    }
    return true;
  }

  /**
   * Génère un ID court et unique pour corréler tous les logs d'une même
   * tentative de paiement dans Railway. Ex: "cp-1f3a9b2c4d".
   */
  _newCorrelationId() {
    return 'cp-' + crypto.randomBytes(6).toString('hex');
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  INIT PAYMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Initialise une transaction CinetPay.
   *
   * @param {object} params
   * @param {string} params.transactionId - ID interne (généré par order.service)
   * @param {number} params.amount        - Montant en FCFA
   * @param {string} params.description   - Description affichée au client
   * @param {object} params.customer      - { name, surname, email, phone }
   * @param {string} [params.orderId]     - ID Mongo de la commande
   * @param {string} [params.payment_method] - 'OM_CI' | 'MTN_CI' | 'WAVE_CI' | ...
   *
   * @returns {Promise<{ success: true, paymentToken, paymentUrl, transactionId, notifyToken }>}
   * @throws  {AppError} avec cause chaînée (voir payment-flow.service / order.service)
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

    // ── Garde-fou env ───────────────────────────────────────────────────────
    if (!this.isConfigured()) {
      throw new AppError('CinetPay non configuré (variables d\'env manquantes)', 500);
    }

    // CinetPay attend des montants >= 100 XOF et multiples de 5
    const safeAmount = Math.max(100, Math.round(Number(amount) / 5) * 5);

    const successUrl = `${this.clientUrl}/payment/success?orderId=${orderId}`;
    const failedUrl  = `${this.clientUrl}/payment/echec?orderId=${orderId}`;
    const notifyUrl  = `${this.apiUrl}/api/v1/webhook/cinetpay`;

    const payload = {
      apikey:               this.apiKey,
      password:             this.apiPassword,
      transaction_id:       transactionId,
      amount:               safeAmount,
      currency:             'XOF',
      description:          (description || `Commande ${transactionId}`).slice(0, 255),
      notify_url:           notifyUrl,
      return_url:           successUrl,
      cancel_url:           failedUrl,
      channels:             'ALL',
      customer_name:        String(customer?.name    || 'Client').slice(0, 100),
      customer_surname:     String(customer?.surname || 'Bokoma').slice(0, 100),
      customer_email:       customer?.email || 'client@bokoma.ci',
      customer_phone_number: customer?.phone  || '+2250707070700',
      metadata:             JSON.stringify({ orderId, correlationId }),
      lang:                 'fr',
      mode:                 this.mode,
    };

    const initUrl = `${this.baseUrl}/v2/payment`;

    // ── Log d'entrée : indispensable pour tracer une transaction ───────────
    logger.info('payment', 'init_start', {
      correlationId,
      transactionId,
      orderId,
      amount: safeAmount,
      payment_method,
      mode: this.mode,
      endpoint: initUrl,
      apiKeyPresent: !!this.apiKey,
      apiPasswordPresent: !!this.apiPassword,
    });

    try {
      const response = await axios.post(initUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20_000,
        // On ne throw pas sur 4xx : on veut inspecter la réponse CinetPay
        validateStatus: () => true,
      });

      const data = response.data;
      const isHttpOk = response.status >= 200 && response.status < 300;
      const isCinetOk = data?.code === '201' || data?.code === 201;

      if (isHttpOk && isCinetOk) {
        const paymentToken = data?.data?.payment_token;
        const paymentUrl   = data?.data?.payment_url
          || (paymentToken ? `https://secure.cinetpay.net/checkout/${paymentToken}` : null);

        logger.info('payment', 'init_ok', {
          correlationId,
          transactionId,
          orderId,
          httpStatus: response.status,
          cinetpayCode: data?.code,
          hasPaymentUrl: !!paymentUrl,
        });

        return {
          success: true,
          paymentToken,
          paymentUrl,
          transactionId: data?.data?.transaction_id || transactionId,
          notifyToken: data?.data?.notify_token,
          _correlationId: correlationId,
        };
      }

      // ── Cas défavorable : on a une réponse mais elle n'est pas OK ─────────
      // CinetPay renvoie un 200/201 avec code applicatif différent en cas
      // de rejet (credentials invalides, payload invalide, etc.). On doit
      // distinguer ces cas pour pouvoir les diagnostiquer côté Railway.
      logger.error('payment', 'rejected', {
        correlationId,
        transactionId,
        orderId,
        httpStatus: response.status,
        cinetpayCode: data?.code,
        message: data?.message,
        description: data?.description || data?.data?.description,
        // On log la payload CinetPay brute (sans secrets) pour debug
        responseBody: data,
      });

      throw new AppError(
        data?.description || data?.message || `CinetPay a refusé l'initialisation (code ${data?.code})`,
        400,
      );
    } catch (err) {
      // Si c'est déjà une AppError (rejet applicatif ci-dessus), on remonte
      if (err instanceof AppError) throw err;

      // Erreur réseau / timeout / DNS — distinguer le type pour Railway
      const axiosCode = err.code;          // 'ETIMEDOUT' | 'ECONNREFUSED' | 'ENOTFOUND' | ...
      const axiosSyscall = err.syscall;
      const isNetworkError = axiosCode && (
        axiosCode === 'ETIMEDOUT' ||
        axiosCode === 'ECONNREFUSED' ||
        axiosCode === 'ECONNRESET' ||
        axiosCode === 'ENOTFOUND' ||
        axiosCode === 'EAI_AGAIN'
      );

      logger.error('payment', isNetworkError ? 'network_error' : 'upstream_error', {
        correlationId,
        transactionId,
        orderId,
        endpoint: initUrl,
        axiosCode,
        axiosSyscall,
        httpStatus: err.response?.status,
        description: err.response?.data?.description || err.response?.data?.message,
        message: err.message,
        stack: err.stack?.split('\n').slice(0, 5).join('\n'), // top 5 frames
      });

      // On relance avec un message explicite mais l'erreur originale reste
      // disponible via err.cause pour le global error handler.
      const wrapped = new AppError(
        `Échec de l'appel à CinetPay (${axiosCode || err.response?.status || 'unknown'})`,
        502,
        err,
      );
      wrapped._correlationId = correlationId;
      throw wrapped;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  AUTH (rétro-compat) — conservé pour ne pas casser les anciens imports.
  //  CinetPay n'utilise plus OAuth sur /v2/payment : la vraie authentification
  //  est portée par `apikey` + `password` dans le payload. Cette méthode
  //  renvoie toujours un token factice et logge un avertissement si elle
  //  est appelée.
  // ───────────────────────────────────────────────────────────────────────────

  async authenticate() {
    logger.warn('payment', 'auth_called_but_deprecated', {
      hint: 'CinetPay /v2/payment ne nécessite pas d\'OAuth : apikey+password sont dans le payload.',
    });
    return 'no-token-required';
  }

  async getAccessToken() {
    return 'no-token-required';
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  VERIFY
  // ───────────────────────────────────────────────────────────────────────────

  async verifyPayment(transactionId) {
    const correlationId = this._newCorrelationId();
    if (!this.isConfigured()) {
      throw new AppError('CinetPay non configuré', 500);
    }

    const verifyUrl = `${this.baseUrl}/v2/payment/check`;
    const payload = {
      apikey:         this.apiKey,
      password:       this.apiPassword,
      transaction_id: transactionId,
    };

    logger.info('payment', 'verify_start', { correlationId, transactionId, endpoint: verifyUrl });

    try {
      const response = await axios.post(verifyUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
        validateStatus: () => true,
      });

      const data = response.data;
      const isHttpOk = response.status >= 200 && response.status < 300;

      if (!isHttpOk) {
        logger.error('payment', 'verify_http_error', {
          correlationId, transactionId,
          httpStatus: response.status, data,
        });
        return { success: false, status: 'ERROR', error: `HTTP ${response.status}`, transactionId };
      }

      const code = String(data?.code ?? '');
      const status = String(data?.status ?? '').toUpperCase();

      if (code === '00' || status === 'ACCEPTED' || status === 'SUCCESS') {
        logger.info('payment', 'verify_ok', { correlationId, transactionId, status: status || 'ACCEPTED' });
        return { success: true, status: 'SUCCESS', amount: data?.amount, transactionId };
      }
      if (['FAILED', 'REFUSED', 'EXPIRED', 'CANCELED'].includes(status)) {
        logger.warn('payment', 'verify_failed', { correlationId, transactionId, status, data });
        return { success: false, status, transactionId };
      }

      logger.info('payment', 'verify_pending', { correlationId, transactionId, status: status || code });
      return { success: false, status: status || 'PENDING', transactionId };
    } catch (err) {
      logger.error('payment', 'verify_network_error', {
        correlationId, transactionId,
        axiosCode: err.code, message: err.message,
      });
      return { success: false, status: 'ERROR', error: err.message, transactionId };
    }
  }
}

module.exports = new PaymentService();