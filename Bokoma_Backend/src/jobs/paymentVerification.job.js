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
    console.log(`\n🔍 [PaymentVerification] ═══════════════════════════════════════`);
    console.log(`🔍 [PaymentVerification] Vérification à ${now.toISOString()}`);

    // 1️⃣ Nettoyer les vieilles commandes (> 24h)
    const maxPendingDate = new Date(now.getTime() - MAX_PENDING_HOURS * 60 * 60 * 1000);
    const oldOrders = await Order.find({
      'payment.status': 'pending',
      createdAt: { $lt: maxPendingDate },
    });

    if (oldOrders.length > 0) {
      console.log(`🧹 Nettoyage de ${oldOrders.length} vieille(s) commande(s)`);
      for (const order of oldOrders) {
        try {
          order.markAsExpired();
          await order.save();
          console.log(`🗑️ #${order.orderNumber} annulée (> 24h)`);
        } catch (err) {
          console.error(`❌ Erreur nettoyage:`, err.message);
        }
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

    console.log(`📦 ${pendingOrders.length} commande(s) à vérifier`);

    if (pendingOrders.length === 0) {
      console.log(`✅ Aucune commande à vérifier\n`);
      return { verified: 0, updated: 0, skipped: 0 };
    }

    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const order of pendingOrders) {
      try {
        const attempt = (order.payment.verificationAttempts || 0) + 1;
        console.log(`\n🔍 Vérification #${order.orderNumber} (tentative ${attempt}/${MAX_VERIFICATION_ATTEMPTS})`);

        // ✅ Utiliser paymentService (MÊME API que createOrder)
        const result = await paymentService.verifyPayment(order.payment.transactionId);

        order.payment.verificationAttempts = attempt;
        order.payment.lastVerificationAt = now;

        if (result.success) {
          order.payment.status = 'paid';
          order.payment.paidAt = new Date();
          order.payment.amountPaid = result.amount || order.total;
          order.status = 'confirmed';
          await order.save();

          console.log(`✅ #${order.orderNumber} CONFIRMÉE`);
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

          console.log(`❌ #${order.orderNumber} ÉCHOUÉE (${result.status})`);
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
          console.log(`⚠️ Erreur API pour #${order.orderNumber}: ${result.error}`);
          
          if (attempt >= MAX_VERIFICATION_ATTEMPTS) {
            console.log(`🛑 Max tentatives atteint, blocage`);
            order.payment.verificationBlocked = true;
            order.payment.verificationBlockedReason = result.error || 'API indisponible';
            await order.save();
            skippedCount++;
          } else {
            await order.save();
          }

        } else {
          console.log(`⏳ #${order.orderNumber} toujours en attente (${result.status})`);
          await order.save();
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        console.error(`❌ Erreur pour #${order.orderNumber}:`, err.message);
      }
    }

    console.log(`\n✅ Résultat: ${updatedCount} confirmées, ${failedCount} échouées, ${skippedCount} ignorées`);
    console.log(`✅ [PaymentVerification] ═══════════════════════════════════════\n`);

    return { verified: pendingOrders.length, updated: updatedCount, failed: failedCount, skipped: skippedCount };
  } catch (err) {
    console.error('❌ [PaymentVerification] Erreur globale:', err);
    return { verified: 0, updated: 0, failed: 0, skipped: 0 };
  }
}

function startPaymentVerificationJob() {
  console.log('🚀 [PaymentVerification] Démarrage (toutes les 2 minutes)');
  setTimeout(verifyPendingPayments, 15000);
  setInterval(verifyPendingPayments, 2 * 60 * 1000);
}

module.exports = { verifyPendingPayments, startPaymentVerificationJob };