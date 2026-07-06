// src/controllers/feedback.controller.js
const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const AppError = require('../utils/AppError');

const { Types } = mongoose;

// ───────────────────────────────────────────────────────────────────────────
// 🔹 Helpers
// ───────────────────────────────────────────────────────────────────────────

const assertAdminOrManager = (req) => {
  if (!['admin', 'manager'].includes(req.user?.role)) {
    throw new AppError('Accès refusé. Réservé aux administrateurs.', 403);
  }
};

const isValidObjectId = (id) => Types.ObjectId.isValid(id);

// Anti-flood basique : limite par IP (en mémoire process — simple efficace).
// Pour un multi-instance, basculer sur Redis ultérieurement.
const SUBMISSION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const SUBMISSION_MAX = 3;
const recentSubmissions = new Map();

const canSubmitFromIp = (ip) => {
  const now = Date.now();
  const recent = (recentSubmissions.get(ip) || []).filter(
    (t) => now - t < SUBMISSION_WINDOW_MS
  );
  if (recent.length >= SUBMISSION_MAX) {
    return false;
  }
  recent.push(now);
  recentSubmissions.set(ip, recent);
  return true;
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 PUBLIC : créer un feedback
// POST /api/v1/feedbacks
// Body: { category, subject?, message, rating?, contactEmail?, authorName?, product?, order? }
// ───────────────────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const {
      category,
      subject,
      message,
      rating,
      contactEmail,
      authorName,
      product,
      order,
    } = req.body;

    if (!category || !message) {
      throw new AppError('Les champs catégorie et message sont obligatoires.', 400);
    }
    if (!Feedback.CATEGORIES.includes(category)) {
      throw new AppError('Catégorie invalide.', 400);
    }
    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        throw new AppError('La note doit être comprise entre 1 et 5.', 400);
      }
    }
    if (product && !isValidObjectId(product)) {
      throw new AppError('Identifiant produit invalide.', 400);
    }
    if (order && !isValidObjectId(order)) {
      throw new AppError('Identifiant commande invalide.', 400);
    }

    // Anti-flood
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (!canSubmitFromIp(ip)) {
      throw new AppError(
        'Vous avez déjà soumis plusieurs retours récemment. Merci de patienter quelques minutes.',
        429
      );
    }

    // Si l'utilisateur est connecté, on récupère nom/email depuis son profil
    let userId = null;
    let resolvedName = authorName || '';
    let resolvedEmail = contactEmail || '';
    if (req.user) {
      userId = req.user._id;
      resolvedName = resolvedName || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      resolvedEmail = resolvedEmail || req.user.email || '';
    }

    const feedback = await Feedback.create({
      category,
      subject: subject || '',
      message,
      rating: rating ?? null,
      authorName: resolvedName,
      contactEmail: resolvedEmail,
      user: userId,
      product: product || null,
      order: order || null,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || '',
      // ← Important : tout nouveau feedback est "pending" et NON public.
      //   Un admin doit l'approuver pour qu'il devienne visible sur le site.
      status: 'pending',
      isPublic: false,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: feedback._id,
        category: feedback.category,
        status: feedback.status,
        createdAt: feedback.createdAt,
      },
      message: 'Merci pour votre retour ! Il sera examiné par notre équipe avant publication.',
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 PUBLIC : lister les feedbacks approuvés et publics
// GET /api/v1/feedbacks
// Query params: page, limit, category
// ───────────────────────────────────────────────────────────────────────────
exports.listPublic = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

    const items = await Feedback.findPublic({
      page,
      limit,
      category: req.query.category,
    });

    const filter = { status: 'approved', isPublic: true };
    if (req.query.category) filter.category = req.query.category;
    const total = await Feedback.countDocuments(filter);

    res.json({
      success: true,
      data: items,
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
// 🔹 PUBLIC : catégories disponibles (utile au front pour peupler les filtres)
// GET /api/v1/feedbacks/categories
// ───────────────────────────────────────────────────────────────────────────
exports.listCategories = async (req, res, next) => {
  try {
    const labels = {
      site_feedback:   { label: 'Avis sur le site',            emoji: '💬' },
      purchase_issue:  { label: "Difficulté d'achat",          emoji: '⚠️' },
      improvement:     { label: "Suggestion d'amélioration",   emoji: '💡' },
      product_opinion: { label: 'Avis produit',                 emoji: '⭐' },
      after_sales:     { label: 'Service après-vente',         emoji: '🛠️' },
    };
    res.json({ success: true, data: Feedback.CATEGORIES.map((c) => ({ id: c, ...labels[c] })) });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : lister tous les feedbacks (avec filtres)
// GET /api/v1/feedbacks/admin
// Query params: page, limit, status, category
// ───────────────────────────────────────────────────────────────────────────
exports.listAdmin = async (req, res, next) => {
  try {
    assertAdminOrManager(req);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Feedback.find(filter)
        .populate('user', 'firstName lastName email avatar')
        .populate({
          path: 'product',
          select: 'name slug images',
        })
        .populate('order', 'orderNumber status')
        .populate('respondedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    // ✅ Tronque le message pour le listing (économise le payload)
    const lightweight = items.map((it) => ({
      ...it,
      messageFull: it.message,
      message: it.message?.length > 220 ? `${it.message.slice(0, 220).trimEnd()}…` : it.message,
      // Garde uniquement la 1re image du produit pour la vignette
      product: it.product
        ? { ...it.product, images: Array.isArray(it.product.images) ? it.product.images.slice(0, 1) : it.product.images }
        : it.product,
    }));

    res.json({
      success: true,
      data: lightweight,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : détail
// GET /api/v1/feedbacks/admin/:id
// ───────────────────────────────────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    assertAdminOrManager(req);
    const item = await Feedback.findById(req.params.id)
      .populate('user', 'firstName lastName email avatar')
      .populate('product', 'name slug images')
      .populate('order', 'orderNumber status')
      .populate('respondedBy', 'firstName lastName')
      .lean();
    if (!item) throw new AppError('Feedback introuvable.', 404);
    // Détail → message complet (pas d'excerpt ici)
    res.json({ success: true, data: { ...item, messageFull: item.message } });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : mettre à jour le statut (approuver / rejeter / archiver)
// PATCH /api/v1/feedbacks/admin/:id/status
// Body: { status, isPublic?, isAnonymous?, adminResponse? }
// ───────────────────────────────────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    assertAdminOrManager(req);

    const { status, isPublic, isAnonymous, adminResponse } = req.body;
    if (status && !Feedback.STATUSES.includes(status)) {
      throw new AppError('Statut invalide.', 400);
    }

    const update = {};
    if (status) update.status = status;
    if (isPublic !== undefined) update.isPublic = !!isPublic;
    if (isAnonymous !== undefined) update.isAnonymous = !!isAnonymous;
    if (adminResponse !== undefined) {
      update.adminResponse = adminResponse;
      update.respondedAt = new Date();
      update.respondedBy = req.user._id;
    }

    const item = await Feedback.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!item) throw new AppError('Feedback introuvable.', 404);

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : supprimer
// DELETE /api/v1/feedbacks/admin/:id
// ───────────────────────────────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    assertAdminOrManager(req);
    const item = await Feedback.findByIdAndDelete(req.params.id);
    if (!item) throw new AppError('Feedback introuvable.', 404);
    res.json({ success: true, message: 'Feedback supprimé avec succès.' });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ADMIN : stats globales
// GET /api/v1/feedbacks/admin/stats
// ───────────────────────────────────────────────────────────────────────────
exports.stats = async (req, res, next) => {
  try {
    assertAdminOrManager(req);
    const data = await Feedback.getStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
