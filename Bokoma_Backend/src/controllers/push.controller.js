// src/controllers/push.controller.js
// ============================================================================
// 🔔 PUSH CONTROLLER — endpoints pour gérer les abonnements PWA
// ============================================================================

const pushService = require('../services/push.service');

// ── GET /api/v1/push/vapid-public-key ────────────────────────────────────
// Public : sers la clé publique VAPID au frontend. Pas d'auth requise
// (la clé publique est, par définition, publique).
exports.getVapidPublicKey = (req, res) => {
  const publicKey = pushService.getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      message: 'Push notifications non configurées sur le serveur (VAPID manquant)',
    });
  }
  res.json({ success: true, data: { publicKey } });
};

// ── POST /api/v1/push/subscribe ──────────────────────────────────────────
// Auth requise : enregistre (ou met à jour) la subscription de l'user connecté.
exports.subscribe = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const subscription = req.body;
    const userAgent = req.headers['user-agent'] || null;

    const result = await pushService.saveSubscription(userId, subscription, userAgent);

    res.json({
      success: true,
      message: result.created ? 'Abonnement push enregistré' : 'Abonnement déjà existant',
      data: { created: result.created },
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/v1/push/subscribe ────────────────────────────────────────
// Auth requise : supprime la subscription (logout, désactivation notifs, etc.)
exports.unsubscribe = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'endpoint requis' });
    }

    const result = await pushService.removeSubscription(userId, endpoint);
    res.json({
      success: true,
      message: result.removed ? 'Abonnement supprimé' : 'Abonnement introuvable',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/push/test ───────────────────────────────────────────────
// Auth admin : envoie une notif test à l'user courant (ou à un userId spécifié)
// Utile pour tester le flow end-to-end sans devoir placer une vraie commande.
exports.sendTest = async (req, res, next) => {
  try {
    const userId = req.body?.userId || req.user?.userId || req.user?._id?.toString();
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId requis' });
    }

    const result = await pushService.sendPushToUser(userId, {
      title: req.body?.title || '🧪 Test Bokoma',
      body:  req.body?.body  || 'Si vous voyez ceci, les notifications marchent !',
      url:   req.body?.url   || '/',
      tag:   'bokoma-test',
      icon:  '/icon.png',
    });

    res.json({
      success: true,
      message: `Test envoyé : ${result.sent} OK, ${result.failed} KO, ${result.cleaned} nettoyés`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
