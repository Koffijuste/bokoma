// scripts/cleanOldPayments.js
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../src/models/Order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bokoma-store';

async function cleanOldPayments() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connecté\n');

    // 1️⃣ Réinitialiser les compteurs de vérification
    console.log('🔄 Réinitialisation des compteurs de vérification...');
    const resetResult = await Order.updateMany(
      { 'payment.status': 'pending' },
      {
        $set: {
          'payment.verificationAttempts': 0,
          'payment.verificationBlocked': false,
          'payment.verificationBlockedReason': null,
          'payment.lastVerificationAt': null,
        },
      }
    );
    console.log(`✅ ${resetResult.modifiedCount} commande(s) réinitialisée(s)\n`);

    // 2️⃣ Annuler les vieilles commandes (> 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log(`🧹 Annulation des commandes en attente depuis plus de 24h...`);
    
    const oldOrders = await Order.find({
      'payment.status': 'pending',
      createdAt: { $lt: oneDayAgo },
    });

    console.log(`📦 ${oldOrders.length} commande(s) à annuler`);

    for (const order of oldOrders) {
      try {
        order.markAsExpired();
        await order.save();
        console.log(`✅ Commande #${order.orderNumber} annulée`);
      } catch (err) {
        console.error(`❌ Erreur pour ${order._id}:`, err.message);
      }
    }

    console.log('\n✅ Nettoyage terminé !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

cleanOldPayments();