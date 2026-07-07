class AppError extends Error {
  /**
   * @param {string} message  - Message user-facing
   * @param {number} statusCode - HTTP status code
   * @param {Error}  [cause] - Erreur originale (pour chaining ES2022)
   *
   * Usage :
   *   throw new AppError('Erreur de paiement', 500, originalCinetPayError);
   *
   * Côté logs on verra les deux stacks (la nôtre + l'originale),
   * côté client on reste sur le message générique pour ne pas
   * exposer les détails internes.
   */
  constructor(message, statusCode, cause) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    if (cause) this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;