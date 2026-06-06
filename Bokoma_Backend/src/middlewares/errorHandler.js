const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Erreur serveur interne';

  // Mongoose : ID invalide
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Ressource non trouvée : ${err.path} invalide`;
  }

  // Mongoose : doublon (clé unique)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message    = `La valeur "${err.keyValue[field]}" existe déjà pour le champ "${field}"`;
  }

  // Mongoose : validation
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message    = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // JWT
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Token invalide'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token expiré, reconnectez-vous'; }

  console.error('Global error handler:', err && err.stack ? err.stack : err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;