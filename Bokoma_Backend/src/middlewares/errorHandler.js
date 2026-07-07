// src/middlewares/errorHandler.js
// ============================================================================
// 🚨 GLOBAL ERROR HANDLER — capture toutes les erreurs Express et renvoie
//    une réponse JSON cohérente. Sur Railway, on logge en JSON structuré
//    via logger.error('http', 'request_failed', ...). Le correlationId
//    permet de suivre une erreur à travers tous les services.
// ============================================================================

const logger = require('../utils/logger');

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

  // ─── Log structuré unique pour Railway ──────────────────────────────────────
  // Toutes les infos essentielles au debug en une seule ligne grep-able :
  //   - method + url + statusCode + status HTTP final
  //   - correlationId si l'erreur en porte un (payment, order)
  //   - cause chaînée (cause.message + cause.code + cause.status) si présente
  //   - userId si on est authentifié
  logger.error('http', 'request_failed', {
    correlationId: err._correlationId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    userId: req.user?.userId || req.user?._id?.toString(),
    message,
    errorName: err.name,
    // Erreur Axios éventuelle
    axiosCode: err.code,
    axiosMessage: err.response?.data?.description || err.response?.data?.message,
    httpStatus: err.response?.status,
    // Cause chaînée (AppError → erreur originelle)
    cause: err.cause ? {
      name: err.cause.name,
      message: err.cause.message,
      code: err.cause.code,
      status: err.cause.status || err.cause.response?.status,
      description:
        err.cause.response?.data?.description ||
        err.cause.response?.data?.message ||
        err.cause.description,
    } : undefined,
    // Stack uniquement en dev pour éviter de polluer les logs prod
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack?.split('\n').slice(0, 10).join('\n'),
    }),
  });

  res.status(statusCode).json({
    success: false,
    message,
    // En prod on expose le correlationId dans la réponse pour que le
    // support client puisse le retrouver dans les logs Railway.
    ...(err._correlationId && { correlationId: err._correlationId }),
    ...(err._orderNumber && { orderNumber: err._orderNumber }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;