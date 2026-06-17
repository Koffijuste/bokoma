// src/middlewares/validate.js
const { validationResult } = require('express-validator');

// Ce middleware doit être placé APRÈS les règles de validation dans la route
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.error('❌ [Validation] Erreurs détectées:', errors.array());
    
    return res.status(422).json({
      success: false,
      message: 'Données de commande invalides',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  // Si tout est bon, on passe au contrôleur
  next();
};

module.exports = handleValidationErrors;