// src/utils/logger.js
// ============================================================================
// 🪵 STRUCTURED LOGGER — Logs JSON prêts pour Railway / grep / log shippers
// ============================================================================
// Pourquoi un logger maison alors qu'il existe winston/pino ?
//   - Pas de dépendance ajoutée (zéro risque côté `npm install` Railway)
//   - Format stable, préfixé `[bokoma]`, facile à grepper dans les logs
//   - Sérialisation safe des erreurs (cause chaînée, status, description)
//   - Activation/désactivation via LOG_LEVEL=info|debug|warn|error
// ============================================================================

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// Lecture du LOG_LEVEL (défaut: info en prod, debug en dev)
const envLevel = (process.env.LOG_LEVEL || '').toLowerCase();
const currentLevel =
  LEVELS[envLevel] ??
  (process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug);

/**
 * Masque les secrets dans un objet avant logging (apikey, password, token).
 * @param {object} obj
 * @returns {object}
 */
const redactSecrets = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (
      lower.includes('apikey') ||
      lower.includes('api_key') ||
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('authorization')
    ) {
      out[k] = '***REDACTED***';
    } else if (v && typeof v === 'object') {
      out[k] = redactSecrets(v);
    } else {
      out[k] = v;
    }
  }
  return out;
};

/**
 * Normalise une erreur vers un objet JSON-friendly.
 * Ne throw jamais : si quelque chose plante, on log quand même un placeholder.
 *
 * @param {Error|object|string|undefined} err
 * @returns {object}
 */
const normalizeError = (err) => {
  if (!err) return { message: 'unknown error' };
  if (typeof err === 'string') return { message: err };

  // Erreur Axios : on capture la réponse HTTP si présente
  const axiosResponse = err.response;
  const result = {
    name: err.name,
    message: err.message,
    code: err.code,
    status: axiosResponse?.status ?? err.statusCode,
    statusText: axiosResponse?.statusText,
    description:
      axiosResponse?.data?.description ||
      axiosResponse?.data?.message ||
      err.description,
    url: axiosResponse?.config?.url,
    method: axiosResponse?.config?.method,
  };

  if (err.cause) {
    result.cause = normalizeError(err.cause);
  }
  if (err.stack) result.stack = err.stack;
  return result;
};

/**
 * Émet une ligne JSON structurée sur la sortie standard (stdout ou stderr).
 * @param {string} level
 * @param {string} tag       Préfixe court pour grep, ex: "payment", "order"
 * @param {string} event     Nom de l'event, ex: "auth_failed", "init_ok"
 * @param {object} [data]    Champs additionnels
 */
const emit = (level, tag, event, data = {}) => {
  if (LEVELS[level] < currentLevel) return;

  const safeData = redactSecrets(data);
  const payload = {
    ts: new Date().toISOString(),
    level,
    app: 'bokoma',
    tag,
    event,
    ...safeData,
  };

  // Si data contient `error`, on le normalise pour avoir un format stable
  if (safeData && safeData.error && typeof safeData.error === 'object') {
    payload.error = normalizeError(safeData.error);
  }

  let line;
  try {
    line = `[bokoma] ${JSON.stringify(payload)}`;
  } catch {
    // Circular ref → fallback safe
    line = `[bokoma] ${JSON.stringify({
      ts: payload.ts,
      level: payload.level,
      tag: payload.tag,
      event: payload.event,
      message: 'log_serialization_failed',
    })}`;
  }

  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
};

const logger = {
  debug: (tag, event, data) => emit('debug', tag, event, data),
  info:  (tag, event, data) => emit('info',  tag, event, data),
  warn:  (tag, event, data) => emit('warn',  tag, event, data),
  error: (tag, event, data) => emit('error', tag, event, data),

  /** Helper pour normaliser une erreur avant de la passer en log. */
  err: normalizeError,
};

module.exports = logger;