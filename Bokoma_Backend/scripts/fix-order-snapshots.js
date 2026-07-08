// scripts/fix-order-snapshots.js
// ============================================================================
// 🔧 FIX ORDER SNAPSHOTS — Répare les commandes aux snapshots cassés
// ============================================================================
// Symptôme : dans /dashboard/orders, les articles apparaissent en
// "Aucune taille renseignée pour cet article" avec name='Produit' et sku='N/A'.
//
// Cause : un ancien flux dans cart.controller.addItem stockait des
// placeholders. Les snapshots sont immuables (par design), donc la seule
// façon de les corriger est de les réécrire en DB.
//
// Usage :
//   node scripts/fix-order-snapshots.js                  # dry-run par défaut
//   node scripts/fix-order-snapshots.js --apply          # écrit en DB
//   node scripts/fix-order-snapshots.js --limit 50       # limite à 50 commandes
//   node scripts/fix-order-snapshots.js --batch-size 25  # pagine par 25
//
// En npm : `npm run fix:order-snapshots` / `npm run fix:order-snapshots:apply`
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const Order = require('../src/models/Order');
const {
  enrichSingleItem,
  enrichOrderItems,
  enrichOrders,
} = require('../src/services/order.service');

// ─────────────────────────────
// Args parsing
// ─────────────────────────────
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = process.argv[process.argv.indexOf(arg) + 1];
    acc[key] = next && !next.startsWith('--') ? next : true;
  }
  return acc;
}, {});

const APPLY = args.apply === true || args.apply === 'true';
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const BATCH_SIZE = args.batchSize ? parseInt(args.batchSize, 10) : 100;

// ─────────────────────────────
// Filtre des commandes cassées
// ─────────────────────────────
// On vise les commandes dont UN des items a l'air cassé. La fonction
// d'enrichissement est idempotente donc on ne risque rien à en attraper trop.
const BROKEN_FILTER = {
  $or: [
    { 'items.name': 'Produit' },
    { 'items.sku': 'N/A' },
    // Les items sans size / color / image ne sont pas dans le filtre : c'est
    // plus rapide d'enrichir tout le monde que d'essayer de prédire. Mais
    // on filtre quand même sur les symptômes les plus évidents pour ne pas
    // scanner toute la collection.
  ],
};

// ─────────────────────────────
// Logger minimaliste
// ─────────────────────────────
const log = (level, msg, extra) => {
  const stamp = new Date().toISOString().slice(11, 19);
  const tag = level === 'error' ? '❌' : level === 'warn' ? '⚠️ ' : 'ℹ️ ';
  console.log(`[${stamp}] ${tag} ${msg}`, extra ?? '');
};

// ─────────────────────────────
// Run
// ─────────────────────────────
async function run() {
  const MONGO_URI =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL;

  if (!MONGO_URI) {
    log('error', 'Aucune variable MongoDB trouvée (MONGO_URI/MONGODB_URI)');
    process.exit(1);
  }

  log('info', `Mode: ${APPLY ? 'APPLY (écriture en DB)' : 'DRY-RUN (lecture seule)'}`);
  log('info', `Batch size: ${BATCH_SIZE}${LIMIT ? ` (limité à ${LIMIT} commandes)` : ''}`);
  log('info', `URI: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***@')}`);

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    log('info', 'MongoDB connecté');

    const totalToProcess = await Order.countDocuments(BROKEN_FILTER);
    log('info', `Commandes correspondantes au filtre: ${totalToProcess}`);

    if (totalToProcess === 0) {
      log('info', '✅ Aucune commande à enrichir. Terminé.');
      await mongoose.disconnect();
      return;
    }

    const effectiveLimit = LIMIT ? Math.min(LIMIT, totalToProcess) : totalToProcess;
    let skip = 0;
    let processedOrders = 0;
    let modifiedOrders = 0;
    let totalItemsModified = 0;

    while (processedOrders < effectiveLimit) {
      const remaining = effectiveLimit - processedOrders;
      const take = Math.min(BATCH_SIZE, remaining);

      const orders = await Order.find(BROKEN_FILTER)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take);

      if (orders.length === 0) break;

      // Snapshot des items AVANT pour savoir ce qui a changé
      const beforeSnapshots = orders.map((o) =>
        o.items.map((it) => ({
          name: it.name, sku: it.sku, size: it.size, color: it.color, image: it.image,
        })),
      );

      const itemsModified = await enrichOrders(orders);
      totalItemsModified += itemsModified;

      // Détermine quelles commandes ont effectivement changé
      let batchModifiedOrders = 0;
      for (let i = 0; i < orders.length; i++) {
        const before = beforeSnapshots[i];
        const order = orders[i];
        const changed = order.items.some((it, idx) => {
          const a = before[idx];
          return (
            a.name !== it.name ||
            a.sku !== it.sku ||
            a.size !== it.size ||
            a.color !== it.color ||
            a.image !== it.image
          );
        });
        if (changed) {
          batchModifiedOrders++;
          if (APPLY) {
            order.markModified('items');
            await order.save();
            log('info', `  💾 Commande #${order.orderNumber} mise à jour`);
          }
        }
      }

      modifiedOrders += batchModifiedOrders;
      processedOrders += orders.length;
      skip += orders.length;

      log(
        'info',
        `  Batch [${orders.length}] → ${batchModifiedOrders} commande(s) modifiée(s), ${itemsModified} item(s) enrichi(s). ` +
          `Total: ${processedOrders}/${effectiveLimit} traitées, ${modifiedOrders} modifiées, ${totalItemsModified} items`,
      );
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    log('info', `✅ Migration terminée (mode: ${APPLY ? 'APPLY' : 'DRY-RUN'})`);
    log('info', `   Commandes analysées:  ${processedOrders}`);
    log('info', `   Commandes modifiées:  ${modifiedOrders}`);
    log('info', `   Items enrichis:       ${totalItemsModified}`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (!APPLY && modifiedOrders > 0) {
      console.log('');
      log('warn', 'Aucun changement n\'a été persisté. Relancer avec --apply pour écrire en DB.');
    } else if (APPLY) {
      console.log('');
      log('info', 'Les changements ont été sauvegardés en base.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    log('error', 'Échec de la migration', err.message);
    console.error(err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

// Laisse le temps aux logs de partir
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
