// src/middlewares/validateObjectId.js
// ============================================================================
// 🔍 VALIDATE OBJECT ID — Middleware de validation d'ObjectId MongoDB
// ============================================================================

const { isValidObjectId } = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Middleware pour valider qu'un paramètre de route est un ObjectId MongoDB valide
 * 
 * @param {string|string[]} paramNames - Nom(s) du/des paramètre(s) à valider
 * @param {Object} options - Options de validation
 * @param {boolean} options.required - Si true, l'ID doit être présent (défaut: true)
 * @param {boolean} options.allowArray - Si true, accepte les IDs séparés par virgule
 * @returns {Function} Middleware Express
 * 
 * @example
 * // Validation simple
 * router.get('/:id', validateObjectId('id'), controller.get);
 * 
 * // Validation multiple
 * router.post('/compare', validateObjectId(['id1', 'id2']), controller.compare);
 * 
 * // Validation optionnelle
 * router.get('/:id', validateObjectId('id', { required: false }), controller.get);
 */
module.exports = (paramNames, options = {}) => {
  const { required = true, allowArray = false } = options;
  
  // ✅ Normaliser en tableau pour supporter plusieurs paramètres
  const params = Array.isArray(paramNames) ? paramNames : [paramNames];
  
  return (req, res, next) => {
    const errors = [];
    
    for (const paramName of params) {
      const value = req.params[paramName];
      
      // ✅ Vérifier présence si requis
      if (!value) {
        if (required) {
          errors.push(`Paramètre '${paramName}' manquant`);
        }
        continue;
      }
      
      // ✅ Support des IDs multiples séparés par virgule
      if (allowArray && value.includes(',')) {
        const ids = value.split(',').map(id => id.trim()).filter(Boolean);
        const invalidIds = ids.filter(id => !isValidObjectId(id));
        
        if (invalidIds.length > 0) {
          errors.push(`IDs invalides dans '${paramName}': ${invalidIds.join(', ')}`);
        }
        continue;
      }
      
      // ✅ Validation standard
      if (!isValidObjectId(value)) {
        errors.push(`ID invalide pour '${paramName}': "${value}"`);
      }
    }
    
    // ✅ Si erreurs, retourner 400 avec détails
    if (errors.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [validateObjectId] Validation failed:', errors);
      }
      return next(new AppError(errors.join('. '), 400));
    }
    
    next();
  };
};


module.exports.isValid = (value) => isValidObjectId(value);