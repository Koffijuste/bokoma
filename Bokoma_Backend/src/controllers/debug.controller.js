// src/controllers/debug.controller.js
//
// 🛠  ROUTE DE DIAGNOSTIC — ADMIN ONLY (cf. debug.routes.js)
//
// Sert à récupérer l'IP **sortante** que Railway utilise pour appeler
// CinetPay (et n'importe quel service externe). Nécessaire parce que
// CinetPay exige que l'IP du serveur soit whitelistée dans son dashboard,
// et Railway ne documente pas ses IPs de sortie de manière stable.
//
// Quand CinetPay renvoie apiCode=2011 / "This Ip is not withlisted",
// il faut :
//   1. curl https://bokoma-backend-production.up.railway.app/api/v1/debug/ip
//   2. ajouter l'IP renvoyée dans le dashboard CinetPay (IP whitelist)
//   3. tester un paiement
//
// Kill switch d'urgence : ENABLE_DEBUG_ROUTES=false côté serveur.

const axios = require('axios');
const logger = require('../utils/logger');

// Plusieurs services d'écho IP en fallback — si l'un est down, on tente le suivant.
const IP_ECHO_SERVICES = [
  { name: 'ipify',   url: 'https://api.ipify.org?format=json',     parse: (d) => d.ip },
  { name: 'ifconfig',url: 'https://ifconfig.me/ip',                parse: (d) => d.trim() },
  { name: 'ipinfo',  url: 'https://ipinfo.io/json',                parse: (d) => d.ip },
  { name: 'icanhaz', url: 'https://icanhazip.com',                 parse: (d) => d.trim() },
];

// GET /api/v1/debug/ip
// Renvoie l'IP sortante du conteneur (celle que CinetPay verra).
// Protégée par protect + restrictTo('admin') au niveau du routeur.
exports.getOutboundIp = async (req, res) => {
  const errors = [];

  // 🪵 Audit log : on trace QUI a demandé l'IP et depuis OÙ. C'est une route
  // sensible (leak d'infra Railway + IP de sortie = info de reconnaissance
  // réseau). Toute consultation doit être loggée.
  logger.info('debug', 'ip_lookup', {
    userId:        req.user?.userId,
    email:         req.user?.email,
    role:          req.user?.role,
    requestIp:     req.ip,
    userAgent:     req.get('user-agent'),
    timestamp:     new Date().toISOString(),
  });

  for (const svc of IP_ECHO_SERVICES) {
    try {
      const r = await axios.get(svc.url, {
        timeout: 5000,
        responseType: svc.parse.length > 20 ? 'json' : 'text',
        // axios transforme 'text' en string — on veut garder le format brut pour ifconfig/icanhazip
        transformResponse: (d) => d,
      });
      const ip = svc.parse(r.data);
      if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        return res.status(200).json({
          success: true,
          outboundIp: ip,
          detectedBy: svc.name,
          // Infos pratiques pour debug :
          railwayRegion: process.env.RAILWAY_REGION || 'unknown',
          railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'unknown',
          service: process.env.RAILWAY_SERVICE_NAME || 'unknown',
          nodeEnv: process.env.NODE_ENV,
          // Note : si l'IP change après redéploiement, il faudra re-whitelister
          warning: 'Railway egress IPs are dynamic — this IP may change on redeploy. For a fixed IP, consider Railway Pro ($20/mo).',
          timestamp: new Date().toISOString(),
        });
      }
      errors.push({ service: svc.name, reason: 'invalid response format', raw: String(r.data).slice(0, 200) });
    } catch (err) {
      errors.push({
        service: svc.name,
        reason: err.message,
        code: err.code,
        status: err.response?.status,
      });
    }
  }

  // Aucun service n'a répondu → on renvoie quand même l'IP "vue" par la requête entrante,
  // qui peut être différente de l'IP sortante mais ça donne une piste.
  return res.status(500).json({
    success: false,
    message: 'Aucun service d\'écho IP n\'a répondu',
    errors,
    fallbackRequestIp: req.ip,
    note: 'Si req.ip est différent de l\'IP sortante CinetPay, ce n\'est pas la bonne IP.',
  });
};