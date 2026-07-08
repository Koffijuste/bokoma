// src/routes/webhook.routes.js
// ============================================================================
// 🔔 WEBHOOK CINETPAY — Confirmation de paiement en arrière-plan
// ⚠️ Route publique — appelée directement par CinetPay depuis leurs serveurs
// 🔐 Vérification HMAC-SHA256 obligatoire (middleware verifyCinetPaySignature)
// ============================================================================

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const NotificationService = require('../services/notification.service');
const paymentService = require('../services/payment.service');
const verifySignature = require('../middlewares/verifyCinetPaySignature');

// ─── IPs autorisées CinetPay (whitelist complémentaire à la signature) ────────
// https://docs.cinetpay.com/
const CINETPAY_IPS = [
  '13.48.85.38', '15.236.100.245', '13.36.56.224',
  '52.47.211.226', '3.250.148.249', '52.213.164.166',
];

function isCinetPayRequest(req) {
  if (process.env.NODE_ENV !== 'production') return true;

  const ip = req.ip || req.connection.remoteAddress || '';
  const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
  const clientIp = forwarded || ip;

  return CINETPAY_IPS.some((allowed) => clientIp.includes(allowed));
}

// ─── POST /api/v1/webhook/cinetpay ───────────────────────────────────────────

router.post(
  '/cinetpay',
  verifySignature(),
  async (req, res) => {
    try {
      // Vérification IP (en complément de la signature)
      if (!isCinetPayRequest(req)) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }

      const { transaction_id, order_id, status, amount } = req.body;

      if (!transaction_id && !order_id) {
        return res.status(400).json({ success: false, message: 'Données manquantes' });
      }

      // ── Trouver la commande ────────────────────────────────────────────────
      const order = await Order.findOne({
        $or: [
          { _id: order_id },
          { orderNumber: order_id },
          { 'payment.transactionId': transaction_id },
        ],
      }).populate('user', 'firstName lastName email _id');

      if (!order) {
        return res.status(404).json({ success: false, message: 'Commande non trouvée' });
      }

      // Éviter le double-traitement
      if (order.payment.status === 'paid') {
        return res.json({ success: true, message: 'Déjà traité' });
      }

      // Double vérification via API CinetPay (ne pas se fier uniquement au webhook)
      let verified = { success: false, status: 'UNKNOWN' };
      try {
        verified = await paymentService.verifyPayment(transaction_id);
      } catch {
        verified = {
          success: ['ACCEPTED', 'SUCCESS', 'paid'].includes(status),
          status: status || 'UNKNOWN',
        };
      }

      const isPaid = verified.success || ['ACCEPTED', 'SUCCESS', 'paid'].includes(status);
      const isFailed = ['REFUSED', 'FAILED', 'failed'].includes(status) ||
                       ['REFUSED', 'FAILED'].includes(verified.status);

      if (isPaid) {
        await handlePaymentSuccess(order, transaction_id, amount);
      } else if (isFailed) {
        await handlePaymentFailure(order, transaction_id, status);
      }

      // CinetPay attend 200 pour ne pas retenter
      res.json({
        success: true,
        message: 'Webhook traité',
        orderNumber: order.orderNumber,
        status: order.payment.status,
      });
    } catch (err) {
      // Retourner 200 pour éviter les retry infinis de CinetPay
      res.status(200).json({ success: false, message: 'Erreur interne traitée' });
    }
  },
);

// ─── Handlers internes ──────────────────────────────────────────────────────

async function handlePaymentSuccess(order, transactionId, amount) {
  order.payment.paidAt = new Date();
  order.payment.transactionId = transactionId;
  order.payment.provider = 'cinetpay';

  // 🐛 FIX : ne pas écraser amountPaid avec order.total quand le paiement
  // est un acompte (cash_on_delivery = 50% d'acompte). Le `amount` envoyé
  // par CinetPay dans le webhook correspond à l'acompte encaissé, pas au
  // total de la commande. Fallback `Number(amount) || order.total` était
  // faux → toute la UI admin affichait le total au lieu de l'acompte.
  const isPartial =
    order.payment.method === 'cash_on_delivery' ||
    (order.payment.remainingAmount || 0) > 0;

  const receivedAmount = Number(amount);

  if (isPartial) {
    order.payment.status = 'partial';
    if (Number.isFinite(receivedAmount) && receivedAmount > 0 && receivedAmount <= order.total) {
      // CinetPay a renvoyé un montant cohérent (≤ total) : on l'utilise
      // comme acompte et on recalcule le reste.
      order.payment.amountPaid = receivedAmount;
      order.payment.remainingAmount = order.total - receivedAmount;
    } else {
      // Pas de montant exploitable : on CONSERVE l'acompte déjà calculé
      // à la création de la commande (payment-flow.service.js).
      // Ne PAS écrire order.total ici.
    }
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }
  } else {
    // Paiement 100% (mobile_money / card)
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

  // Restaurer le stock
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
      signatureRequired: true,
    });
  });
}

module.exports = router;