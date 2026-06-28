// src/routes/webhook.routes.js
// ============================================================================
// 🔔 WEBHOOK CINETPAY — Confirmation de paiement en arrière-plan
// ⚠️ Route publique — appelée directement par CinetPay depuis leurs serveurs
// ============================================================================

const express             = require('express');
const router              = express.Router();
const Order               = require('../models/Order');
const NotificationService = require('../services/notification.service');
const paymentService      = require('../services/payment.service');

// ─── IPs autorisées CinetPay (whitelist) ─────────────────────────────────────
// https://docs.cinetpay.com/
const CINETPAY_IPS = [
  '13.48.85.38', '15.236.100.245', '13.36.56.224',
  '52.47.211.226', '3.250.148.249', '52.213.164.166',
];

/**
 * Vérifie que la requête vient bien de CinetPay
 * En production : whitelist IP
 * En dev : toujours autorisé (pour tests ngrok)
 */
function isCinetPayRequest(req) {
  if (process.env.NODE_ENV !== 'production') return true;

  const ip = req.ip || req.connection.remoteAddress || '';
  const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
  const clientIp = forwarded || ip;

  return CINETPAY_IPS.some(allowed => clientIp.includes(allowed));
}

// ─── POST /api/v1/webhook/cinetpay ───────────────────────────────────────────

router.post('/cinetpay', async (req, res) => {
  try {
    // ✅ Vérification de la source
    if (!isCinetPayRequest(req)) {
      console.warn('⚠️ [Webhook] IP non autorisée:', req.ip);
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const { transaction_id, order_id, status, amount } = req.body;

    console.log('\n📥 [Webhook] CinetPay reçu:', {
      transaction_id, order_id, status, amount,
    });

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
      console.error('❌ [Webhook] Commande non trouvée:', { order_id, transaction_id });
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    // Éviter le double-traitement
    if (order.payment.status === 'paid') {
      console.log('ℹ️ [Webhook] Déjà traité:', order.orderNumber);
      return res.json({ success: true, message: 'Déjà traité' });
    }

    // ✅ Double vérification via API CinetPay (ne pas se fier uniquement au webhook)
    let verified = { success: false, status: 'UNKNOWN' };
    try {
      verified = await paymentService.verifyPayment(transaction_id);
    } catch (verifyErr) {
      console.error('⚠️ [Webhook] Impossible de vérifier:', verifyErr.message);
      // Continuer avec le statut du webhook si l'API échoue
      verified = {
        success: ['ACCEPTED', 'SUCCESS', 'paid'].includes(status),
        status:  status || 'UNKNOWN',
      };
    }

    const isPaid   = verified.success || ['ACCEPTED', 'SUCCESS', 'paid'].includes(status);
    const isFailed = ['REFUSED', 'FAILED', 'failed'].includes(status) || 
                     ['REFUSED', 'FAILED'].includes(verified.status);

    // ── Paiement confirmé ──────────────────────────────────────────────────
    if (isPaid) {
      order.payment.status      = 'paid';
      order.payment.paidAt      = new Date();
      order.payment.transactionId = transaction_id;
      order.payment.provider    = 'cinetpay';
      order.payment.amountPaid  = Number(amount) || order.total;
      order.status              = 'confirmed';

      order.statusHistory.push({
        status: 'confirmed',
        note:   `Paiement confirmé via webhook CinetPay (${transaction_id})`,
        changedAt: new Date(),
      });

      await order.save();
      console.log('✅ [Webhook] Paiement confirmé:', order.orderNumber);

      // Notification client
      if (order.user?._id) {
        await NotificationService.notifyCustomer({
          userId: order.user._id,
          type:   'payment_success',
          title:  '✅ Paiement confirmé !',
          message: `Votre commande #${order.orderNumber} a été validée avec succès.`,
          data:   { orderId: order._id, orderNumber: order.orderNumber, amount: order.total },
          relatedOrder: order._id,
        }).catch(e => console.error('❌ [Webhook] Notif client:', e.message));
      }

      // Notification admins
      await NotificationService.notifyAdmins({
        type:   'payment_success',
        title:  `💰 Paiement reçu — #${order.orderNumber}`,
        message: `${(order.total).toLocaleString('fr-FR')} FCFA de ${order.user?.firstName ?? 'Client'} ${order.user?.lastName ?? ''}`,
        data:   {
          orderId:     order._id,
          orderNumber: order.orderNumber,
          amount:      order.total,
          customer:    order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Inconnu',
        },
        relatedOrder: order._id,
      }).catch(e => console.error('❌ [Webhook] Notif admin:', e.message));

    // ── Paiement échoué ────────────────────────────────────────────────────
    } else if (isFailed) {
      order.payment.status    = 'failed';
      order.payment.failedAt  = new Date();
      order.payment.transactionId = transaction_id;
      order.status            = 'cancelled';

      order.statusHistory.push({
        status: 'cancelled',
        note:   `Paiement refusé/échoué (${status})`,
        changedAt: new Date(),
      });

      await order.save();
      console.log('❌ [Webhook] Paiement échoué:', order.orderNumber);

      if (order.user?._id) {
        await NotificationService.notifyCustomer({
          userId: order.user._id,
          type:   'payment_failed',
          title:  '❌ Paiement échoué',
          message: `Le paiement de la commande #${order.orderNumber} a échoué. Votre panier a été conservé.`,
          data:   { orderId: order._id, orderNumber: order.orderNumber },
          relatedOrder: order._id,
        }).catch(() => {});
      }

    } else {
      console.log('⏳ [Webhook] Statut en attente:', status, 'pour', order.orderNumber);
    }

    // ✅ CinetPay attend 200 pour ne pas retenter
    res.json({
      success:     true,
      message:     'Webhook traité',
      orderNumber: order.orderNumber,
      status:      order.payment.status,
    });

  } catch (err) {
    console.error('❌ [Webhook] Erreur:', err.message);
    // ✅ Retourner 200 quand même pour éviter les retry CinetPay infinis
    res.status(200).json({ success: false, message: 'Erreur interne traitée' });
  }
});

// ── GET /api/v1/webhook/test ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Webhook OK', timestamp: new Date().toISOString() });
  });
}

module.exports = router;