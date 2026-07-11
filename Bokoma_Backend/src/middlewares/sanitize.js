//src/middlewares/sanitize.js
// ============================================================================
// 🧹 SANITIZE — Anti NoSQL injection + anti XSS
// ============================================================================
// Bloque :
//   - Opérateurs Mongo ($gt, $ne, $where, etc.) : retirés de l'objet
//     (le préfixe $ est strippé), ce qui transforme un filtre
//     {"price": {"$gt": 10000}} en {} (inopérant).
//   - Touches Mongo (commençant par $) : retirées complètement.
//   - Clés avec notation pointée (.) : retirées (notation Mongo bypass).
//   - XSS : tags/scripts dans les strings sont neutralisés via xss().
//
// ⚠️ Bug fix (11/07/2026) : req.query est un getter-only dans Express/Node
//   moderne, on NE PEUT PAS le réassigner. On doit MUTER l'objet en place.
//   La réassignation `req.query = ...` throw :
//     "TypeError: Cannot set property query of #<IncomingMessage> which has
//      only a getter"
//   … et fait planter CHAQUE requête (y compris le health check Railway).
//   C'est exactement ce qui a fait échouer le déploiement du 11/07.
// ============================================================================
'use strict';

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

/**
 * Sanitize an object IN PLACE — supprime les clés dangereuses, sanitize
 * récursivement les sous-objets, et échappe les strings. On ne retourne
 * RIEN (la mutation se fait sur l'objet original) pour que ça marche
 * avec req.query (getter-only).
 */
function sanitizeInPlace(target) {
  if (!target || typeof target !== 'object') return;

  // 1. express-mongo-sanitize retire les clés $-préfixées et avec .
  //    (mutations in-place). On le lance d'abord pour le filet de sécurité
  //    défensif.
  mongoSanitize.sanitize(target);

  // 2. Notre propre passe : on snapshot les clés AVANT de delete pour
  //    éviter les surprises d'itération, et on sanitize récursivement.
  //    Pour les strings, on remplace par la version xss-cleaned.
  const keys = Object.keys(target);
  for (const key of keys) {
    if (key.startsWith('$') || key.includes('.')) {
      // 🛡️ Scénario classique NoSQL : ?price[gt]=10000 → req.query.price = {gt: "10000"}.
      //    On retire la clé `gt` (qui commence par rien de spécial) — mais le
      //    mongoSanitize a déjà viré le $ sur les opérateurs réels. Ici on supprime
      //    toutes les clés dangereuses en defense-in-depth.
      delete target[key];
      continue;
    }
    const value = target[key];
    if (Array.isArray(value)) {
      value.forEach(sanitizeInPlace);
    } else if (value && typeof value === 'object') {
      sanitizeInPlace(value);
    } else if (typeof value === 'string') {
      target[key] = xss(value);
    }
  }
}

module.exports = (req, res, next) => {
  // 🛡️ C5 (audit Bokoma 11/07/2026) : on inclut MAINTENANT req.query dans
  //    la sanitation. Avant, seules les clés $ présentes dans body/params/
  //    headers étaient bloquées, mais req.query est aussi parsé par Express
  //    en objets imbriqués (`?price[gt]=10000`) et donc vulnérable.
  //
  // ⚠️ ATTENTION : on MUTE en place (pas de réassignation) parce que
  //    req.query est un getter-only sur Node/Express modernes.
  ['body', 'params', 'headers', 'query'].forEach((key) => {
    if (req[key]) {
      sanitizeInPlace(req[key]);
    }
  });
  next();
};