// src/controllers/consent.controller.js
// =============================================================================
// 🔐 CONSENT CONTROLLER — Gestion des consentements cookies (CNIL/ePrivacy)
// =============================================================================
const ConsentLog = require('../models/ConsentLog');
const AppError = require('../utils/AppError');

// ───────────────────────────────────────────────────────────────────────────
// 🔹 Helper : extraire l'IP source (compatible proxy / Railway)
// ───────────────────────────────────────────────────────────────────────────
const extractIp = (req) => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 PUBLIC : enregistrer un consentement
// POST /api/v1/consent
// Body : { action, categories: { essential, analytics, marketing }, visitorId? }
// ───────────────────────────────────────────────────────────────────────────
exports.logConsent = async (req, res, next) => {
  try {
    const { action, categories = {}, visitorId = null, bannerVersion } = req.body;

    if (!ConsentLog.ACTIONS.includes(action)) {
      throw new AppError('Action de consentement invalide.', 400);
    }

    // Validation des catégories
    const cleanCategories = {
      essential: categories.essential !== false, // forcé true
      analytics: !!categories.analytics,
      marketing: !!categories.marketing,
    };

    // En cas de accept_all → tout à true ; refuse_all → analytics+marketing à false
    if (action === 'accept_all') {
      cleanCategories.essential = true;
      cleanCategories.analytics = true;
      cleanCategories.marketing = true;
    } else if (action === 'refuse_all') {
      cleanCategories.essential = true;
      cleanCategories.analytics = false;
      cleanCategories.marketing = false;
    }

    const entry = await ConsentLog.create({
      action,
      categories: cleanCategories,
      bannerVersion: bannerVersion || '1.0.0',
      user: req.user?._id || null,
      visitorId,
      ipAddress: extractIp(req),
      userAgent: (req.headers['user-agent'] || '').slice(0, 500),
      language: req.headers['accept-language']?.split(',')[0]?.slice(0, 20) || '',
      referrer: (req.headers['referer'] || req.headers['referrer'] || '').slice(0, 500),
      pageUrl: req.body.pageUrl?.slice(0, 500) || '',
    });

    res.status(201).json({
      success: true,
      data: {
        id: entry._id,
        action: entry.action,
        categories: entry.categories,
        createdAt: entry.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : lister les logs de consentement
// GET /api/v1/consent/admin/logs
// Query : page, limit, action, visitorId, from, to
// ───────────────────────────────────────────────────────────────────────────
exports.listLogs = async (req, res, next) => {
  try {
    if (!['admin', 'manager'].includes(req.user?.role)) {
      throw new AppError('Accès réservé aux administrateurs.', 403);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = {};
    if (req.query.action)   filter.action = req.query.action;
    if (req.query.visitorId) filter.visitorId = req.query.visitorId;

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      ConsentLog.find(filter)
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ConsentLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : statistiques globales de consentement
// GET /api/v1/consent/admin/stats
// ───────────────────────────────────────────────────────────────────────────
exports.stats = async (req, res, next) => {
  try {
    if (!['admin', 'manager'].includes(req.user?.role)) {
      throw new AppError('Accès réservé aux administrateurs.', 403);
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 derniers jours

    const [byAction, byCategoryAcceptance, total, recent] = await Promise.all([
      ConsentLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ]),
      ConsentLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            analytics_accepted: {
              $sum: { $cond: ['$categories.analytics', 1, 0] },
            },
            marketing_accepted: {
              $sum: { $cond: ['$categories.marketing', 1, 0] },
            },
            total: { $sum: 1 },
          },
        },
      ]),
      ConsentLog.countDocuments(),
      ConsentLog.countDocuments({ createdAt: { $gte: since } }),
    ]);

    const acceptance = byCategoryAcceptance[0] || {
      analytics_accepted: 0,
      marketing_accepted: 0,
      total: 0,
    };

    res.json({
      success: true,
      data: {
        total,
        last30d: recent,
        byAction,
        acceptanceRate: {
          analytics:
            acceptance.total > 0
              ? Math.round((acceptance.analytics_accepted / acceptance.total) * 100)
              : 0,
          marketing:
            acceptance.total > 0
              ? Math.round((acceptance.marketing_accepted / acceptance.total) * 100)
              : 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};