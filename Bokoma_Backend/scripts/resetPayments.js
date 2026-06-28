// scripts/resetPayments.js
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const NotificationService = require('../src/services/notification.service');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bokoma-store';

async function resetPayments() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connecté à MongoDB\n');

    // 1️⃣ Trouver toutes les commandes en attente de paiement
    const pendingOrders = await Order.find({
      'payment.status': { $in: ['pending', 'failed', 'expired'] },
    }).populate('user', 'firstName lastName email');

    console.log(`📦 ${pendingOrders.length} commande(s) trouvée(s) en attente\n`);

    if (pendingOrders.length === 0) {
      console.log('✅ Aucune commande à réinitialiser');
      process.exit(0);
    }

    // 2️⃣ Afficher les commandes
    pendingOrders.forEach((order, index) => {
      console.log(`${index + 1}. Commande #${order.orderNumber}`);
      console.log(`   Client: ${order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Inconnu'}`);
      console.log(`   Total: ${order.total} FCFA`);
      console.log(`   Statut actuel: ${order.payment.status}`);
      console.log(`   Créée le: ${order.createdAt}`);
      console.log('');
    });

    // 3️⃣ Demander confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('\n⚠️  Voulez-vous marquer TOUTES ces commandes comme PAYÉES ? (oui/non): ', async (answer) => {
      if (answer.toLowerCase() !== 'oui') {
        console.log('❌ Opération annulée');
        readline.close();
        process.exit(0);
      }

      readline.question('Entrez la raison (ex: "Paiement CinetPay confirmé manuellement"): ', async (reason) => {
        let updatedCount = 0;

        for (const order of pendingOrders) {
          try {
            // Marquer comme payé
            order.payment.status = 'paid';
            order.payment.paidAt = new Date();
            order.payment.transactionId = `MANUAL-${Date.now()}-${order._id}`;
            order.payment.provider = 'cinetpay';
            order.payment.amountPaid = order.total;
            order.payment.rejectionReason = reason || 'Paiement confirmé manuellement';
            order.status = 'confirmed';
            
            await order.save();
            
            console.log(`✅ Commande #${order.orderNumber} marquée comme payée`);
            updatedCount++;

            // Notification au client
            if (order.user) {
              await NotificationService.notifyCustomer({
                userId: order.user._id,
                type: 'payment_success',
                title: 'Paiement confirmé !',
                message: `Votre commande #${order.orderNumber} a été validée avec succès.`,
                data: {
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  amount: order.total,
                },
                relatedOrder: order._id,
              });
            }

            // Notification aux admins
            await NotificationService.notifyAdmins({
              type: 'payment_success',
              title: `Paiement confirmé - #${order.orderNumber}`,
              message: `Paiement de ${order.total} FCFA confirmé pour la commande #${order.orderNumber}`,
              data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                amount: order.total,
              },
              relatedOrder: order._id,
            });

          } catch (err) {
            console.error(`❌ Erreur pour #${order.orderNumber}:`, err.message);
          }
        }

        console.log(`\n✅ ${updatedCount}/${pendingOrders.length} commande(s) mise(s) à jour`);
        readline.close();
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

resetPayments();