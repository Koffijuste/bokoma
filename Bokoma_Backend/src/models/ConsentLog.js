// src/models/ConsentLog.js
// =============================================================================
// 🔐 CONSENT LOG — Preuve de consentement CNIL / ePrivacy
// =============================================================================
// Chaque interaction de l'utilisateur avec la bannière cookies est tracée :
//   - acceptAll / refuseAll / save (granulaire)
//   - catégories acceptées/refusées
//   - horodatage, IP, userAgent, version du banner
//
// Rétention : 13 mois minimum (recommandation CNIL)
// =============================================================================
const mongoose = require('mongoose');

const CONSENT_CATEGORIES = ['essential', 'analytics', 'marketing'];
const CONSENT_ACTIONS = ['accept_all', 'refuse_all', 'save_custom', 'update'];

const consentLogSchema = new mongoose.Schema(
  {
    // ───────────────────────────────────────────────
    // 🎯 ACTION & CATÉGORIES
    // ───────────────────────────────────────────────
    action: {
      type: String,
      enum: CONSENT_ACTIONS,
      required: true,
      index: true,
    },
    categories: {
      essential:  { type: Boolean, default: true },  // toujours true (technique)
      analytics:  { type: Boolean, default: false },
      marketing:  { type: Boolean, default: false },
    },

    // ───────────────────────────────────────────────
    // 🔖 VERSION DU BANNER (preuve d'évolution)
    // ───────────────────────────────────────────────
    bannerVersion: {
      type: String,
      default: '1.0.0',
    },

    // ───────────────────────────────────────────────
    // 🌐 SOURCE / CONTEXTE
    // ───────────────────────────────────────────────
    // Si l'utilisateur est connecté, on garde la trace pour audit
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Anonyme (visitorId) — pour corréler plusieurs logs d'un même visiteur
    visitorId: {
      type: String,
      default: null,
      index: true,
    },

    // ───────────────────────────────────────────────
    // 🛰️ MÉTADONNÉES TECHNIQUES (preuve CNIL)
    // ───────────────────────────────────────────────
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    language:  { type: String, default: '' },
    referrer:  { type: String, default: '' },

    // ───────────────────────────────────────────────
    // 📍 ORIGINE DE L'APPEL (utile en débug)
    // ───────────────────────────────────────────────
    pageUrl: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ───────────────────────────────────────────────
// 🔹 INDEXES
// ───────────────────────────────────────────────
// Lookup rapide par visiteur (analyse comportementale)
consentLogSchema.index({ visitorId: 1, createdAt: -1 });
// Stats par période pour les exports CNIL
consentLogSchema.index({ createdAt: -1 });
// Lookup par utilisateur connecté
consentLogSchema.index({ user: 1, createdAt: -1 });

// ───────────────────────────────────────────────
// 🔹 TTL — purge automatique après 13 mois (recommandation CNIL)
// ───────────────────────────────────────────────
consentLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 13 * 30 * 24 * 60 * 60 } // ~13 mois
);

// ───────────────────────────────────────────────
// 🔹 EXPORTS
// ───────────────────────────────────────────────
consentLogSchema.statics.CATEGORIES = CONSENT_CATEGORIES;
consentLogSchema.statics.ACTIONS = CONSENT_ACTIONS;

module.exports = mongoose.model('ConsentLog', consentLogSchema);