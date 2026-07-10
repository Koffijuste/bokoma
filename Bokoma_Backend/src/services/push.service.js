// src/services/push.service.js
// ============================================================================
// 🔔 PUSH NOTIFICATIONS SERVICE — Web Push (VAPID) pour la PWA
// ============================================================================
// Utilise le package `web-push` pour envoyer des notifications aux abonnés
// PWA via les serveurs push de Mozilla/Google/Apple.
//
// Sécurité VAPID :
//   - La clé privée ne sort JAMAIS du serveur (signature des requêtes push)
//   - La clé publique est servie via GET /api/v1/push/vapid-public-key
//   - Le frontend la passe à PushManager.subscribe() pour l'authentification
//
// Fiabilité :
//   - Si une subscription est morte (410 Gone, 404 Not Found), on la
//     supprime automatiquement de la DB (cleanup défensif)
//   - Les autres échecs sont loggés mais ne plantent pas le caller
// ============================================================================

const webpush = require('web-push');
const User = require('../models/User');
const logger = require('../utils/logger');

// ── Configuration VAPID au démarrage du module ─────────────────────────
let configured = false;
const ensureVapidConfigured = () => {
  if (configured) return true;
  const publicKey  = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject    = process.env.VAPID_SUBJECT || 'mailto:contact@bokoma.ci';

  if (!publicKey || !privateKey) {
    logger.warn('push', 'vapid_not_configured', {
      hint: 'Génère des clés avec `npx web-push generate-vapid-keys` et set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY',
    });
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    logger.info('push', 'vapid_configured', { subject });
    return true;
  } catch (err) {
    logger.error('push', 'vapid_config_failed', { error: err.message });
    return false;
  }
};

// Initialise au load (best-effort, ne crash pas le serveur)
ensureVapidConfigured();

/**
 * Récupère la clé publique VAPID pour le frontend.
 * @returns {string|null}
 */
const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

/**
 * Enregistre (ou met à jour) une subscription push pour un user.
 * @param {string} userId
 * @param {object} subscription  { endpoint, keys: { p256dh, auth } }
 * @param {string} userAgent
 */
const saveSubscription = async (userId, subscription, userAgent) => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Subscription invalide (endpoint + keys.p256dh + keys.auth requis)');
  }

  // Upsert : si l'endpoint existe déjà on update, sinon on push
  const result = await User.updateOne(
    { _id: userId, 'pushSubscriptions.endpoint': { $ne: subscription.endpoint } },
    {
      $push: {
        pushSubscriptions: {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
          userAgent: userAgent || null,
          createdAt: new Date(),
        },
      },
    },
  );

  if (result.modifiedCount === 0) {
    // Soit le user n'existe pas, soit l'endpoint existe déjà. On vérifie :
    const user = await User.findById(userId).select('pushSubscriptions');
    if (!user) throw new Error('Utilisateur introuvable');
    // L'endpoint existe déjà → no-op (idempotent)
    return { created: false };
  }
  return { created: true };
};

/**
 * Supprime une subscription push pour un user (logout / unsubscribe).
 * @param {string} userId
 * @param {string} endpoint
 */
const removeSubscription = async (userId, endpoint) => {
  const result = await User.updateOne(
    { _id: userId },
    { $pull: { pushSubscriptions: { endpoint } } },
  );
  return { removed: result.modifiedCount > 0 };
};

/**
 * Envoie une notification push à UN user (toutes ses subscriptions).
 * Nettoie automatiquement les endpoints morts (410/404).
 *
 * @param {string} userId
 * @param {object} payload  { title, body, url?, icon?, tag?, data? }
 * @returns {Promise<{sent: number, failed: number, cleaned: number}>}
 */
const sendPushToUser = async (userId, payload) => {
  if (!ensureVapidConfigured()) {
    logger.warn('push', 'send_skipped_vapid_not_configured');
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const user = await User.findById(userId).select('pushSubscriptions');
  if (!user || !user.pushSubscriptions?.length) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url || '/',
    icon:  payload.icon,
    tag:   payload.tag,
    data:  payload.data,
  });

  let sent = 0;
  let failed = 0;
  let cleaned = 0;
  const dead = []; // endpoints à supprimer

  // Envoi en parallèle (mais on collecte les résultats pour le cleanup)
  await Promise.allSettled(
    user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          jsonPayload,
          {
            TTL: 60 * 60 * 24, // 24h : les serveurs push retry pendant 24h
            urgency: 'normal',
          },
        );
        sent++;
      } catch (err) {
        failed++;
        // 404/410 = subscription morte, on la marque pour suppression
        if (err.statusCode === 404 || err.statusCode === 410) {
          dead.push(sub.endpoint);
          cleaned++;
        } else {
          logger.warn('push', 'send_failed', {
            userId: userId.toString(),
            endpoint: sub.endpoint.slice(0, 60) + '…',
            statusCode: err.statusCode,
            error: err.message,
          });
        }
      }
    }),
  );

  // Cleanup défensif des endpoints morts
  if (dead.length > 0) {
    await User.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint: { $in: dead } } } },
    );
    logger.info('push', 'cleaned_dead_subscriptions', {
      userId: userId.toString(),
      count: dead.length,
    });
  }

  logger.info('push', 'send_summary', {
    userId: userId.toString(),
    sent,
    failed,
    cleaned,
    title: payload.title,
  });
  return { sent, failed, cleaned };
};

// ── Templates de notifications pour les événements de commande ─────────
const ORDER_STATUS_TEMPLATES = {
  paid: {
    title: (n) => `✅ Paiement confirmé — #${n}`,
    body:  (n) => `Votre paiement pour la commande #${n} a été reçu. Préparation en cours.`,
    url:   (id) => `/orders/${id}/confirmation`,
    tag:   (id) => `order-${id}-paid`,
  },
  shipped: {
    title: (n) => `🚚 Commande expédiée — #${n}`,
    body:  (n) => `Votre commande #${n} est en route ! Suivez la livraison.`,
    url:   (id) => `/orders/${id}`,
    tag:   (id) => `order-${id}-shipped`,
  },
  delivered: {
    title: (n) => `📦 Commande livrée — #${n}`,
    body:  (n) => `Votre commande #${n} a été livrée. Merci pour votre confiance !`,
    url:   (id) => `/orders/${id}/confirmation`,
    tag:   (id) => `order-${id}-delivered`,
  },
  cancelled: {
    title: (n) => `❌ Commande annulée — #${n}`,
    body:  (n) => `Votre commande #${n} a été annulée.`,
    url:   (id) => `/orders/${id}`,
    tag:   (id) => `order-${id}-cancelled`,
  },
  payment_failed: {
    title: (n) => `⚠️ Paiement échoué — #${n}`,
    body:  (n) => `Le paiement de #${n} a échoué. Réessayez ou choisissez un autre mode.`,
    url:   (id) => `/payment/echec?orderId=${id}`,
    tag:   (id) => `order-${id}-payment-failed`,
  },
  payment_expired: {
    title: (n) => `⏰ Paiement expiré — #${n}`,
    body:  (n) => `Le délai de paiement pour #${n} a expiré. Commandez à nouveau.`,
    url:   (id) => `/orders/${id}`,
    tag:   (id) => `order-${id}-expired`,
  },
};

/**
 * Helper haut-niveau : envoie la notif de statut commande appropriée.
 * @param {object} order  - Order mongoose doc (ou plain object)
 * @param {string} event - 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'payment_failed' | 'payment_expired'
 */
const notifyOrderStatus = async (order, event) => {
  const tpl = ORDER_STATUS_TEMPLATES[event];
  if (!tpl) {
    logger.warn('push', 'unknown_order_event', { event });
    return null;
  }
  if (!order?.user) {
    // Pas d'user associé (commande guest), pas de push
    return null;
  }
  const userId = typeof order.user === 'object' ? order.user.toString() : order.user;
  const payload = {
    title: tpl.title(order.orderNumber),
    body:  tpl.body(order.orderNumber),
    url:   tpl.url(order._id?.toString?.() || order._id),
    tag:   tpl.tag(order._id?.toString?.() || order._id),
    icon:  '/icon.png',
    data: {
      orderId: order._id?.toString?.() || order._id,
      orderNumber: order.orderNumber,
      event,
    },
  };
  return sendPushToUser(userId, payload);
};

module.exports = {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  sendPushToUser,
  notifyOrderStatus,
  // Exposé pour les tests
  ORDER_STATUS_TEMPLATES,
};
