const { validationResult } = require('express-validator');

/**
 * Middleware qui récupère les erreurs express-validator
 * et renvoie un 422 si des erreurs existent.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Données invalides',
      errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validate;