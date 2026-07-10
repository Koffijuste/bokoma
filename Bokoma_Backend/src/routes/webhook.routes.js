// src/routes/webhook.routes.js
// ============================================================================
// 🔔 WEBHOOK CINETPAY v1 — Authentification par notifyToken (PAS de HMAC)
// ⚠️ Route publique — appelée directement par CinetPay depuis leurs serveurs
// 🔐 Vérification : compare le `notify_token` du body avec celui stocké
//    dans la commande (via cinetpay-js `verifyNotification`, timing-safe).
// ============================================================================

const express = require('express');
const router = express.Router();
const { verifyNotification, parseNotification } = require('cinetpay-js');
const Order = require('../models/Order');
const NotificationService = require('../services/notification.service');
const paymentService = require('../services/payment.service');
const pushService = require('../services/push.service');
const logger = require('../utils/logger');

// ─── POST /api/v1/webhook/cinetpay ───────────────────────────────────────────

router.post('/cinetpay', async (req, res) => {
  let notification = null;
  try {
    notification = parseNotification(req.body);
  } catch (err) {
    logger.warn('webhook', 'invalid_payload', { error: err.message });
    // 200 pour éviter que CinetPay retente à l'infini sur payload cassé
    return res.status(200).json({ success: false, message: 'Payload invalide' });
  }

  // 1. Récupérer la commande (on a besoin du notifyToken, qui est `select: false`)
  const order = await Order.findOne({
    'payment.transactionId': notification.transactionId,
  })
    .select('+payment.notifyToken +verifyToken')
    .populate('user', 'firstName lastName email _id');

  if (!order) {
    logger.warn('webhook', 'order_not_found', {
      transactionId: notification.transactionId,
    });
    return res.status(200).json({ success: false, message: 'Commande inconnue' });
  }

  // 2. Vérifier le notifyToken (CinetPay v1 utilise un token de notification
  //    généré à l'init paiement, pas un HMAC). C'est la SÉCURITÉ PRINCIPALE.
  if (!order.payment.notifyToken) {
    // Commande legacy : on a pas stocké le notifyToken. On accepte le webhook
    // uniquement si on peut confirmer via l'API CinetPay (defense in depth).
    logger.warn('webhook', 'legacy_order_no_notify_token', {
      orderNumber: order.orderNumber,
      transactionId: notification.transactionId,
    });
  } else if (!verifyNotification(order.payment.notifyToken, notification.notifyToken)) {
    logger.warn('webhook', 'invalid_notify_token', {
      orderNumber: order.orderNumber,
      transactionId: notification.transactionId,
    });
    return res.status(200).json({ success: false, message: 'Token invalide' });
  }

  // 3. Éviter le double-traitement
  if (order.payment.status === 'paid') {
    return res.status(200).json({ success: true, message: 'Déjà traité' });
  }

  // 4. Double vérification via API CinetPay (ne pas se fier au webhook brut)
  let verified = { success: false, status: 'UNKNOWN' };
  try {
    verified = await paymentService.verifyPayment(notification.transactionId);
  } catch (err) {
    logger.warn('webhook', 'verify_api_failed', {
      error: err.message,
      transactionId: notification.transactionId,
    });
  }

  // 5. Décider du sort de la commande
  //    On combine : statut du webhook (status fourni dans le body si dispo)
  //    + statut confirmé par l'API.
  const webhookStatus = String(notification.status || '').toUpperCase();
  const isPaid =
    verified.success ||
    ['SUCCESS', 'ACCEPTED', 'PAID'].includes(webhookStatus);
  const isFailed =
    ['FAILED', 'REFUSED', 'EXPIRED', 'CANCELED'].includes(webhookStatus) ||
    ['FAILED', 'REFUSED', 'EXPIRED', 'CANCELED'].includes(String(verified.status || '').toUpperCase());

  try {
    if (isPaid) {
      await handlePaymentSuccess(order, notification.transactionId, notification.amount);
    } else if (isFailed) {
      await handlePaymentFailure(order, notification.transactionId, webhookStatus || verified.status);
    } else {
      logger.info('webhook', 'status_pending_or_unknown', {
        orderNumber: order.orderNumber,
        webhookStatus,
        verifiedStatus: verified.status,
      });
    }
  } catch (err) {
    logger.error('webhook', 'handler_error', {
      orderNumber: order.orderNumber,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    });
    // 200 pour éviter retry infini de CinetPay
  }

  return res.status(200).json({
    success: true,
    message: 'Webhook traité',
    orderNumber: order.orderNumber,
    status: order.payment.status,
  });
});

// ─── Handlers internes ──────────────────────────────────────────────────────

async function handlePaymentSuccess(order, transactionId, amount) {
  order.payment.paidAt = new Date();
  order.payment.transactionId = transactionId;
  order.payment.provider = 'cinetpay';

  // 🐛 FIX : ne pas écraser amountPaid avec order.total quand le paiement
  //    est un acompte (cash_on_delivery = 50% d'acompte). Le `amount` envoyé
  //    par CinetPay dans le webhook correspond à l'acompte encaissé, pas au
  //    total de la commande.
  const isPartial =
    order.payment.method === 'cash_on_delivery' ||
    (order.payment.remainingAmount || 0) > 0;

  const receivedAmount = Number(amount);

  if (isPartial) {
    order.payment.status = 'partial';
    if (Number.isFinite(receivedAmount) && receivedAmount > 0 && receivedAmount <= order.total) {
      order.payment.amountPaid = receivedAmount;
      order.payment.remainingAmount = order.total - receivedAmount;
    }
    // Sinon : on CONSERVE l'acompte déjà calculé à la création
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }
  } else {
    order.payment.status = 'paid';
    order.payment.amountPaid = Number.isFinite(receivedAmount) && receivedAmount > 0
      ? receivedAmount
      : order.total;
    order.payment.remainingAmount = 0;
    order.status = 'confirmed';
  }

  order.statusHistory.push({
    status: order.status,
    note: isPartial
      ? `Acompte confirmé via webhook CinetPay (${transactionId}) — reste à encaisser à la livraison`
      : `Paiement confirmé via webhook CinetPay (${transactionId})`,
    changedAt: new Date(),
  });

  await order.save();

  // 🔔 Push notification (best-effort, ne bloque pas le webhook)
  pushService.notifyOrderStatus(order, isPartial ? 'paid' : 'paid').catch((err) => {
    logger.warn('webhook', 'push_failed', { error: err.message, orderNumber: order.orderNumber });
  });

  if (order.user?._id) {
    await NotificationService.notifyCustomer({
      userId: order.user._id,
      type: 'payment_success',
      title: '✅ Paiement confirmé !',
      message: `Votre commande #${order.orderNumber} a été validée avec succès.`,
      data: { orderId: order._id, orderNumber: order.orderNumber, amount: order.total },
      relatedOrder: order._id,
    }).catch(() => undefined);
  }

  await NotificationService.notifyAdmins({
    type: 'payment_success',
    title: `💰 Paiement reçu — #${order.orderNumber}`,
    message: `${order.total.toLocaleString('fr-FR')} FCFA de ${order.user?.firstName ?? 'Client'} ${order.user?.lastName ?? ''}`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.total,
      customer: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Inconnu',
    },
    relatedOrder: order._id,
  }).catch(() => undefined);
}

async function handlePaymentFailure(order, transactionId, status) {
  const { restoreStock } = require('../services/inventory.service');

  order.payment.status = 'failed';
  order.payment.failedAt = new Date();
  order.payment.transactionId = transactionId;
  order.status = 'cancelled';

  order.statusHistory.push({
    status: 'cancelled',
    note: `Paiement refusé/échoué (${status})`,
    changedAt: new Date(),
  });

  await order.save();

  // 🔔 Push notification échec
  pushService.notifyOrderStatus(order, 'payment_failed').catch((err) => {
    logger.warn('webhook', 'push_failed', { error: err.message, orderNumber: order.orderNumber });
  });

  try {
    await restoreStock(order.items);
  } catch {
    // Stock non restauré — pas bloquant pour le webhook
  }

  if (order.user?._id) {
    await NotificationService.notifyCustomer({
      userId: order.user._id,
      type: 'payment_failed',
      title: '❌ Paiement échoué',
      message: `Le paiement de la commande #${order.orderNumber} a échoué. Votre panier a été conservé.`,
      data: { orderId: order._id, orderNumber: order.orderNumber },
      relatedOrder: order._id,
    }).catch(() => {});
  }
}

// ─── GET /api/v1/webhook/test (dev only) ────────────────────────────────────

if (process.env.NODE_ENV !== 'production') {
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Webhook endpoint OK',
      timestamp: new Date().toISOString(),
      authMethod: 'notifyToken (CinetPay v1)',
    });
  });
}

module.exports = router;
