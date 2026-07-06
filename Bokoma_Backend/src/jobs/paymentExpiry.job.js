// src/jobs/paymentExpiry.job.js
const Order = require('../models/Order');
const NotificationService = require('../services/notification.service');
const paymentService = require('../services/payment.service');

// ✅ Configuration optimisée
const EXPIRY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes au lieu de 30s
const MAX_CONCURRENT_CHECKS = 3; // Max 3 vérifications simultanées

let isProcessing = false; // ✅ Flag pour éviter les exécutions concurrentes

async function checkExpiredPayments() {
  // ✅ Éviter les exécutions simultanées
  if (isProcessing) {
    return { expired: 0, reminders: 0 };
  }

  isProcessing = true;

  try {
    const now = new Date();

    const expiredOrders = await Order.getExpiredPendingPayments();

    // ✅ Limiter le nombre de vérifications simultanées
    const ordersToProcess = expiredOrders.slice(0, MAX_CONCURRENT_CHECKS);

    for (const order of ordersToProcess) {
      try {
        // ✅ Vérifier avec paymentService si configuré
        if (order.payment.transactionId && paymentService.isConfigured()) {
          const result = await paymentService.verifyPayment(order.payment.transactionId);

          if (result.success) {
            order.payment.status = 'paid';
            order.payment.paidAt = new Date();
            order.payment.amountPaid = result.amount || order.total;
            order.status = 'confirmed';
            await order.save();

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
              message: `Paiement détecté avant expiration`,
              data: { orderId: order._id, orderNumber: order.orderNumber, amount: order.total },
              relatedOrder: order._id,
            });

            continue;
          }
        }

        order.markAsExpired();
        await order.save();

        if (order.user) {
          await NotificationService.notifyCustomer({
            userId: order.user._id,
            type: 'payment_expired',
            title: 'Commande annulée - Délai dépassé',
            message: `Votre commande #${order.orderNumber} a été annulée.`,
            data: { orderId: order._id, orderNumber: order.orderNumber, amount: order.total },
            relatedOrder: order._id,
          });
        }

        await NotificationService.notifyAdmins({
          type: 'payment_expired',
          title: `Paiement expiré - #${order.orderNumber}`,
          message: `Commande annulée après expiration`,
          data: { orderId: order._id, orderNumber: order.orderNumber, amount: order.total },
          relatedOrder: order._id,
        });
      } catch {
        // best effort
      }
    }

    // Rappels
    const reminderOrders = await Order.getPaymentsToRemind();

    for (const order of reminderOrders) {
      try {
        order.paymentNotified.reminder = true;
        await order.save();

        if (order.user) {
          await NotificationService.notifyCustomer({
            userId: order.user._id,
            type: 'payment_reminder',
            title: 'Rappel - Paiement en attente',
            message: `Votre commande #${order.orderNumber} sera annulée dans moins de 2 minutes.`,
            data: { orderId: order._id, orderNumber: order.orderNumber, amount: order.total },
            relatedOrder: order._id,
          });
        }
      } catch {
        // best effort
      }
    }

    return { expired: expiredOrders.length, reminders: reminderOrders.length };
  } catch {
    return { expired: 0, reminders: 0 };
  } finally {
    isProcessing = false; // ✅ Toujours libérer le flag
  }
}

function startPaymentExpiryJob() {
  setTimeout(checkExpiredPayments, 10000);
  setInterval(checkExpiredPayments, EXPIRY_CHECK_INTERVAL);
}

module.exports = { checkExpiredPayments, startPaymentExpiryJob };
