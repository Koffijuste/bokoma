// src/utils/slugify.js
const slugifyLib = require('slugify');

/**
 * Génère un slug unique.
 * N'ajoute un suffixe QUE s'il y a un vrai conflit.
 * 
 * @param {string} text - Le texte à slugifier
 * @param {object} Model - Le modèle Mongoose pour vérifier l'unicité
 * @param {object} additionalQuery - Filtres supplémentaires (ex: { parent: parentId })
 */
const generateSlug = async (text, Model, additionalQuery = {}) => {
  // Générer le slug de base (ex: "chaussures")
  const baseSlug = slugifyLib(text, { 
    lower: true, 
    strict: true, 
    locale: 'fr',
    remove: /[*+~.()'"!:@]/g 
  });

  // Construire la query de recherche avec les filres additionnels
  const queryBase = { ...additionalQuery };

  // 🎯 Essai 1 : Le slug exact est-il disponible ?
  const existingExact = await Model.findOne({ 
    slug: baseSlug, 
    ...queryBase 
  }).select('slug').lean();

  if (!existingExact) {
    return baseSlug; // ✅ Pas de conflit, on retourne le slug propre
  }

  // ❌ Conflit détecté : on ajoute un suffixe numérique
  let suffix = 1;
  let newSlug;
  
  do {
    newSlug = `${baseSlug}-${suffix}`;
    suffix++;
  } while (await Model.findOne({ 
    slug: newSlug, 
    ...queryBase 
  }).select('slug').lean());
  
  return newSlug;
};

module.exports = { generateSlug };