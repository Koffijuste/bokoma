// src/services/payment-flow.service.js
// ============================================================================
// 💳 PAYMENT FLOW SERVICE — Orchestration du paiement CinetPay
// ============================================================================
// Refacto : ajout de logs structurés (logger) à chaque étape clé pour que
// les erreurs Railway soient traçables. Le correlationId généré par
// payment.service est propagé dans le résultat pour permettre un grep
// facile côté ops.
// ============================================================================

const crypto = require('crypto');
const paymentService = require('./payment.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Mapping des méthodes de paiement vers les canaux CinetPay
const OPERATOR_MAP = {
  OM: 'OM_CI',
  MTN: 'MTN_CI',
  WAVE: 'WAVE_CI',
  MOOV: 'MOOV_CI',
};

const PAYMENT_METHODS_ONLINE = ['mobile_money', 'card'];
const PARTIAL_PAYMENT_RATIO = 0.5; // 50% d'acompte pour le cash_on_delivery
const DEFAULT_PHONE = '+2250707070707';

/**
 * Calcule les montants (acompte + reste) en fonction de la méthode.
 */
const computePaymentAmounts = (total, paymentMethod) => {
  if (paymentMethod === 'cash_on_delivery') {
    const paymentAmount = Math.ceil(total * PARTIAL_PAYMENT_RATIO);
    return {
      paymentAmount,
      remainingAmount: total - paymentAmount,
      isPartialPayment: true,
    };
  }
  return {
    paymentAmount: total,
    remainingAmount: 0,
    isPartialPayment: false,
  };
};

/**
 * Normalise un numéro de téléphone ivoirien au format +225XXXXXXXXXX.
 * Tolère les entrées : +225..., 00225..., 225..., ou 0XXXXXXXXXX.
 */
const normalizePhoneNumber = (rawPhone) => {
  if (!rawPhone) return DEFAULT_PHONE;

  let phone = String(rawPhone).replace(/[\s\-( )]/g, '');
  let nationalNumber = phone;

  if (phone.startsWith('+225')) nationalNumber = phone.slice(4);
  else if (phone.startsWith('00225')) nationalNumber = phone.slice(5);
  else if (phone.startsWith('225')) nationalNumber = phone.slice(3);
  else if (phone.startsWith('0')) nationalNumber = phone.slice(0);

  if (nationalNumber.length === 10 && /^\d+$/.test(nationalNumber)) {
    return `+225${nationalNumber}`;
  }
  return phone.startsWith('+') ? phone : `+225${phone.replace(/^0+/, '')}`;
};

/**
 * Détermine le canal CinetPay à partir de la méthode et de l'opérateur.
 */
const resolveCinetPayMethod = (paymentMethod, operator) => {
  if (operator && OPERATOR_MAP[operator]) return OPERATOR_MAP[operator];
  if (paymentMethod === 'card') return 'CARD';
  return 'OM_CI';
};

/**
 * Construit la description envoyée à CinetPay.
 */
const buildPaymentDescription = (orderNumber, total, isPartial, remainingAmount) => {
  if (isPartial) {
    return `Acompte 50% - Commande Bokoma #${orderNumber} (reste ${remainingAmount} FCFA à la livraison)`;
  }
  return `Commande Bokoma #${orderNumber}`;
};

/**
 * Initialise un paiement CinetPay pour une commande.
 *
 * @param {Object} params
 * @param {String} params.transactionId  - ID de transaction interne (généré avant l'appel)
 * @param {Number} params.amount         - Montant à encaisser (en FCFA)
 * @param {String} params.orderId        - ID Mongo de la commande
 * @param {String} params.orderNumber    - Numéro lisible de la commande
 * @param {Object} params.user           - { firstName, lastName, email, phone }
 * @param {String} params.paymentMethod  - 'card' | 'mobile_money' | 'cash_on_delivery'
 * @param {String} [params.operator]     - 'OM' | 'MTN' | 'WAVE' | 'MOOV'
 *
 * @returns {Promise<{ paymentToken, paymentUrl, paymentAmount, remainingAmount, isPartialPayment, cinetpayMethod, correlationId }>}
 */
const initializeCinetPayPayment = async ({
  transactionId,
  amount,
  orderId,
  orderNumber,
  user,
  paymentMethod,
  operator,
}) => {
  // ID de corrélation généré ICI aussi — visible dès l'entrée du flow
  const flowId = 'flow-' + crypto.randomBytes(5).toString('hex');

  // Garde-fou env vars
  if (!paymentService.isConfigured()) {
    logger.error('payment-flow', 'config_missing', {
      flowId, transactionId, orderId,
    });
    throw new AppError('CinetPay non configuré (variables d\'env manquantes)', 500);
  }

  const { paymentAmount, remainingAmount, isPartialPayment } =
    computePaymentAmounts(amount, paymentMethod);

  const description = buildPaymentDescription(
    orderNumber,
    amount,
    isPartialPayment,
    remainingAmount,
  );

  const customerPhone = normalizePhoneNumber(user?.phone);
  const cinetpayMethod = resolveCinetPayMethod(paymentMethod, operator);

  // Log d'entrée — première chose visible dans Railway si ça plante plus bas
  logger.info('payment-flow', 'init_start', {
    flowId,
    transactionId,
    orderId,
    orderNumber,
    total: amount,
    paymentAmount,
    remainingAmount,
    isPartialPayment,
    paymentMethod,
    operator,
    cinetpayMethod,
    customerPhone,
  });

  try {
    const result = await paymentService.initializePayment({
      transactionId,
      amount: paymentAmount,
      description,
      orderId,
      customer: {
        name:    user?.firstName || 'Client',
        surname: user?.lastName  || 'Bokoma',
        email:   user?.email     || 'client@bokoma.ci',
        phone:   customerPhone,
      },
      payment_method: cinetpayMethod,
    });

    logger.info('payment-flow', 'init_ok', {
      flowId,
      transactionId,
      orderId,
      correlationId: result._correlationId,
      hasPaymentUrl: !!result.paymentUrl,
      hasPaymentToken: !!result.paymentToken,
    });

    return {
      paymentToken: result.paymentToken,
      paymentUrl: result.paymentUrl,
      paymentAmount,
      remainingAmount,
      isPartialPayment,
      cinetpayMethod,
      correlationId: result._correlationId || flowId,
    };
  } catch (err) {
    // On remonte l'erreur telle quelle (déjà typée par payment.service) mais
    // on ajoute un log au niveau "flow" pour pouvoir filtrer facilement.
    logger.error('payment-flow', 'init_failed', {
      flowId,
      transactionId,
      orderId,
      correlationId: err._correlationId,
      appErrorMessage: err.message,
      appErrorStatus: err.statusCode,
      // La cause brute sera déjà loggée par payment.service.js
      hasCause: !!err.cause,
    });
    throw err;
  }
};

/**
 * Vérifie la signature d'un webhook CinetPay (HMAC-SHA256 sur le body brut).
 * Utilise le mot de passe API comme clé secrète.
 *
 * @param {Buffer|string} rawBody - Le body brut de la requête
 * @param {String} providedSignature - Signature fournie dans le header
 * @param {String} secret - Clé secrète (mot de passe API CinetPay)
 * @returns {Boolean}
 */
const verifyWebhookSignature = (rawBody, providedSignature, secret) => {
  if (!rawBody || !providedSignature || !secret) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);

  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Comparaison en temps constant pour éviter les attaques timing
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(String(providedSignature), 'utf8');

  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
};

module.exports = {
  initializeCinetPayPayment,
  verifyWebhookSignature,
  // Helpers exportés pour les tests unitaires
  computePaymentAmounts,
  normalizePhoneNumber,
  resolveCinetPayMethod,
  buildPaymentDescription,
  OPERATOR_MAP,
  DEFAULT_PHONE,
  PARTIAL_PAYMENT_RATIO,
};