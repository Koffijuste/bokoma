//src/middlewares/sanitize.js
// ============================================================================
// 🧹 SANITIZE — Anti NoSQL injection + anti XSS
// ============================================================================
// Bloque :
//   - Opérateurs Mongo ($gt, $ne, $where, etc.) : remplacés par leur valeur
//     primitive (le préfixe $ est strippé), ce qui transforme un filtre
//     {"price": {"$gt": 10000}} en {"price": "gt10000"} (inopérant).
//   - Touches Mongo (commençant par $) : retirées complètement.
//   - XSS : tags/scripts dans les strings sont neutralisés via xss().
// ============================================================================
'use strict';

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

function deepClean(value) {
  if (Array.isArray(value)) {
    return value.map(deepClean);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((sanitized, key) => {
      // 🛡️ Bloque les clés Mongo ($gt, $ne, $where, $regex, etc.)
      //      en les retirant complètement de l'objet. C'est le scénario
      //      d'injection NoSQL classique : ?price[gt]=10000 où Express
      //      parse price comme {gt: "10000"} et le passe tel quel à Mongo.
      if (key.startsWith('$')) {
        return sanitized;
      }
      // Bloque aussi les clés qui contiennent un point, utilisées par Mongo
      // pour la notation pointée (ex: {"$where": "..."}) qui peut bypasser
      // certains filtres si on ne sanitize que les clés $.
      if (key.includes('.')) {
        return sanitized;
      }
      sanitized[key] = deepClean(value[key]);
      return sanitized;
    }, {});
  }

  if (typeof value === 'string') {
    return xss(value);
  }

  return value;
}

function sanitizeObject(target) {
  if (!target || typeof target !== 'object') {
    return target;
  }

  // express-mongo-sanitize retire aussi les $ / . des clés de manière
  // défensive. deepClean fait le ménage final.
  mongoSanitize.sanitize(target);
  return deepClean(target);
}

module.exports = (req, res, next) => {
  // 🛡️ C5 (audit Bokoma 11/07/2026) : on inclut MAINTENANT req.query dans
  //    la sanitation. Avant, seules les clés $ présentes dans body/params/
  //    headers étaient bloquées, mais req.query est aussi parsé par Express
  //    en objets imbriqués (`?price[gt]=10000`) et donc vulnérable.
  ['body', 'params', 'headers', 'query'].forEach((key) => {
    if (req[key]) {
      req[key] = sanitizeObject(req[key]);
    }
  });
  next();
};