const stripe = require('../config/stripe');

/**
 * Crée un PaymentIntent Stripe.
 * @param {number} amount    Montant en centimes (ex : 50000 = 500,00 €)
 * @param {string} currency  Code devise ISO (ex : 'eur', 'xof')
 * @param {object} metadata  Données libres (orderId, userId…)
 */
const createPaymentIntent = async (amount, currency = 'eur', metadata = {}) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount:   Math.round(amount),
    currency: currency.toLowerCase(),
    metadata,
    automatic_payment_methods: { enabled: true },
  });
  return paymentIntent;
};

/**
 * Rembourse un PaymentIntent (total ou partiel).
 * @param {string} paymentIntentId
 * @param {number} [amount]  Montant en centimes (omis = remboursement total)
 */
const refundPayment = async (paymentIntentId, amount) => {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount ? { amount: Math.round(amount) } : {}),
  });
  return refund;
};

/**
 * Vérifie et construit l'event Stripe depuis le webhook.
 */
const constructWebhookEvent = (rawBody, signature) =>
  stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

module.exports = { createPaymentIntent, refundPayment, constructWebhookEvent };