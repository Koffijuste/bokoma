// src/jobs/paymentVerification.job.js
const Order = require('../models/Order');
const NotificationService = require('../services/notification.service');
const paymentService = require('../services/payment.service');

const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_COOLDOWN_MS = 2 * 60 * 1000;
const MAX_PENDING_HOURS = 24;

async function verifyPendingPayments() {
  try {
    const now = new Date();

    // 1️⃣ Nettoyer les vieilles commandes (> 24h)
    const maxPendingDate = new Date(now.getTime() - MAX_PENDING_HOURS * 60 * 60 * 1000);
    const oldOrders = await Order.find({
      'payment.status': 'pending',
      createdAt: { $lt: maxPendingDate },
    });

    for (const order of oldOrders) {
      try {
        order.markAsExpired();
        await order.save();
      } catch {
        // best effort
      }
    }

    // 2️⃣ Récupérer les commandes récentes à vérifier
    const recentPendingDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const pendingOrders = await Order.find({
      'payment.status': 'pending',
      'payment.transactionId': { $exists: true, $ne: null },
      createdAt: { $gte: recentPendingDate },
      'payment.verificationBlocked': { $ne: true },
      $or: [
        { 'payment.verificationAttempts': { $exists: false } },
        { 'payment.verificationAttempts': { $lt: MAX_VERIFICATION_ATTEMPTS } },
        { 'payment.lastVerificationAt': { $lt: new Date(now.getTime() - VERIFICATION_COOLDOWN_MS) } },
      ],
    }).populate('user', 'firstName lastName email');

    if (pendingOrders.length === 0) {
      return { verified: 0, updated: 0, skipped: 0 };
    }

    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const order of pendingOrders) {
      try {
        const attempt = (order.payment.verificationAttempts || 0) + 1;

        // ✅ Utiliser paymentService (MÊME API que createOrder)
        const result = await paymentService.verifyPayment(order.payment.transactionId);

        order.payment.verificationAttempts = attempt;
        order.payment.lastVerificationAt = now;

        if (result.success) {
          // 🐛 FIX : ne plus écraser amountPaid avec order.total quand le
          // paiement est un acompte (cash_on_delivery). À la création de la
          // commande, payment-flow.service.js a déjà calculé paymentAmount
          // (= 50% du total) et remainingAmount ; on doit les conserver.
          // CinetPay renvoie rarement le montant exact via getStatus, donc le
          // fallback `result.amount || order.total` corrompt les paiements
          // partiels en faisant apparaître le total comme "montant payé".
          const isPartial =
            order.payment.method === 'cash_on_delivery' ||
            (order.payment.remainingAmount || 0) > 0;

          if (isPartial) {
            order.payment.status = 'partial';
            order.payment.paidAt = new Date();
            // On ne réécrase PAS amountPaid avec order.total : on garde l'acompte
            // déjà calculé à la création (50% pour cash_on_delivery). Si le SDK
            // renvoie un montant et qu'il est cohérent, on l'utilise, sinon on
            // laisse la valeur existante (= acompte).
            if (
              typeof result.amount === 'number' &&
              result.amount > 0 &&
              result.amount <= order.total
            ) {
              order.payment.amountPaid = result.amount;
              order.payment.remainingAmount = order.total - result.amount;
            }
            // Si le statut de la commande était encore 'pending' côté front,
            // on le passe à 'confirmed' (la commande peut partir en prépa dès
            // que l'acompte est encaissé).
            if (order.status === 'pending') {
              order.status = 'confirmed';
            }
          } else {
            order.payment.status = 'paid';
            order.payment.paidAt = new Date();
            order.payment.amountPaid = result.amount || order.total;
            order.payment.remainingAmount = 0;
            order.status = 'confirmed';
          }
          await order.save();

          updatedCount++;

          if (order.user) {
            await NotificationService.notifyCustomer({
              userId: order.user._id,
              type: 'payment_success',
              title: '✅ Paiement confirmé !',
              message: `Votre commande #${order.orderNumber} a été validée.`,
              data: { orderId: order._id, orderNumber: order.orderNumber, amount: order.total },
              relatedOrder: order._id,
            });
          }

          await NotificationService.notifyAdmins({
            type: 'payment_success',
            title: `💰 Paiement confirmé - #${order.orderNumber}`,
            message: `Paiement de ${order.total.toLocaleString('fr-FR')} FCFA reçu`,
            data: { orderId: order._id, orderNumber: order.orderNumber, amount: order.total },
            relatedOrder: order._id,
          });

        } else if (['FAILED', 'REFUSED', 'EXPIRED', 'CANCELED'].includes(result.status)) {
          order.payment.status = 'failed';
          order.payment.failedAt = new Date();
          order.payment.rejectionReason = `Paiement ${result.status}`;
          order.status = 'cancelled';
          await order.save();

          failedCount++;

          if (order.user) {
            await NotificationService.notifyCustomer({
              userId: order.user._id,
              type: 'payment_failed',
              title: '❌ Paiement échoué',
              message: `Le paiement de #${order.orderNumber} a échoué.`,
              data: { orderId: order._id, orderNumber: order.orderNumber },
              relatedOrder: order._id,
            });
          }

        } else if (result.status === 'ERROR') {
          if (attempt >= MAX_VERIFICATION_ATTEMPTS) {
            order.payment.verificationBlocked = true;
            order.payment.verificationBlockedReason = result.error || 'API indisponible';
            await order.save();
            skippedCount++;
          } else {
            await order.save();
          }

        } else {
          await order.save();
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch {
        // best effort - commande traitée au prochain tick
      }
    }

    return { verified: pendingOrders.length, updated: updatedCount, failed: failedCount, skipped: skippedCount };
  } catch {
    return { verified: 0, updated: 0, failed: 0, skipped: 0 };
  }
}

function startPaymentVerificationJob() {
  setTimeout(verifyPendingPayments, 5000);
  setInterval(verifyPendingPayments, 30 * 1000);
}

module.exports = { verifyPendingPayments, startPaymentVerificationJob };
