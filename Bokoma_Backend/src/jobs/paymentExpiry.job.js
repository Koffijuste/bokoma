// src/jobs/paymentExpiry.job.js
const Order = require('../models/Order');
const NotificationService = require('../services/notification.service');
const paymentService = require('../services/payment.service');

async function checkExpiredPayments() {
  try {
    const now = new Date();
    console.log(`\n🔍 [PaymentExpiryJob] ═══════════════════════════════════════`);
    console.log(`🔍 [PaymentExpiryJob] Vérification à ${now.toISOString()}`);

    const expiredOrders = await Order.getExpiredPendingPayments();
    console.log(`⏰ ${expiredOrders.length} paiement(s) expiré(s)`);

    for (const order of expiredOrders) {
      try {
        // ✅ VÉRIFIER D'ABORD avec paymentService (MÊME API)
        if (order.payment.transactionId && paymentService.isConfigured()) {
          console.log(`🔍 Vérification avant annulation: #${order.orderNumber}`);
          
          const result = await paymentService.verifyPayment(order.payment.transactionId);
          
          if (result.success) {
            console.log(`✅ Paiement trouvé ! #${order.orderNumber} NON annulée`);
            
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

        console.log(`❌ #${order.orderNumber} expirée`);

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
      } catch (err) {
        console.error(`❌ Erreur traitement ${order._id}:`, err.message);
      }
    }

    const reminderOrders = await Order.getPaymentsToRemind();
    console.log(`⏰ ${reminderOrders.length} rappel(s)`);

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
      } catch (err) {
        console.error(`❌ Erreur rappel:`, err.message);
      }
    }

    console.log(`✅ [PaymentExpiryJob] ═══════════════════════════════════════\n`);

    return { expired: expiredOrders.length, reminders: reminderOrders.length };
  } catch (err) {
    console.error('❌ [PaymentExpiryJob] Erreur globale:', err);
    return { expired: 0, reminders: 0 };
  }
}

function startPaymentExpiryJob() {
  console.log('🚀 [PaymentExpiryJob] Démarrage (toutes les 30 secondes)');
  setTimeout(checkExpiredPayments, 10000);
  setInterval(checkExpiredPayments, 30 * 1000);
}

module.exports = { checkExpiredPayments, startPaymentExpiryJob };