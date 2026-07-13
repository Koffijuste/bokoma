// src/services/email.service.js
// ============================================================================
// 📧 EMAIL SERVICE — Resend SDK
// ============================================================================
// Remplace l'ancien transporteur nodemailer + SMTP Gmail (qui obligeait à
// générer un "app password" Google à chaque réinitialisation de 2FA).
//
// Resend = API key au lieu d'app password, deliverability native (DKIM/SPF/
// DMARC gérés), gratuit jusqu'à 3000 emails/mois. Setup : 2 min, juste
// copier RESEND_API_KEY dans le .env.
//
// Setup local / dev sans domaine vérifié :
//   - Le `from` par défaut est `onboarding@resend.dev` (l'adresse partagée
//     de Resend, utilisable SANS vérification de domaine).
//   - Pour envoyer à de vrais destinataires, Resend impose que le `from`
//     soit un domaine vérifié. En prod, on met `RESEND_FROM=Bokoma
//     <noreply@bokomastore.com>` après avoir vérifié bokomastore.com sur resend.com.
//
// Tous les templates ci-dessous (welcome, password reset, order confirm,
// status update) gardent la même signature → aucun changement dans les
// contrôleurs qui les appellent.
// ============================================================================

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  // Fail-fast au démarrage : pas question d'attendre le premier email
  // pour découvrir qu'on a oublié la clé.
  throw new Error(
    '❌ [email] RESEND_API_KEY manquant dans le .env. ' +
    'Crée un compte sur https://resend.com, copie la clé, et redémarre.',
  );
}

const resend = new Resend(apiKey);

// `from` configurable. Default = adresse de test Resend (pas de domaine
// requis). En prod : RESEND_FROM="Bokoma <noreply@bokomastore.com>"
const DEFAULT_FROM = 'Bokoma <onboarding@resend.dev>';

const baseTemplate = (title, content) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header  { background: #1a1a1a; padding: 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .body    { padding: 32px 24px; color: #333; line-height: 1.7; }
    .btn     { display: inline-block; background: #1a1a1a; color: #fff !important;
               text-decoration: none; padding: 12px 28px; border-radius: 6px; margin: 20px 0; }
    .footer  { background: #f4f4f4; padding: 16px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${title}</h1></div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} Bokoma-Store — Tous droits réservés</div>
  </div>
</body>
</html>`;

const sendEmail = async ({ to, subject, html }) => {
  const from = process.env.RESEND_FROM || DEFAULT_FROM;
  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });
  if (error) {
    // Resend renvoie un objet { error } au lieu de throw sur les 4xx.
    // On remballe en Error pour que les contrôleurs catchent comme avant.
    throw new Error(`[Resend] ${error.name || 'send_failed'}: ${error.message}`);
  }
  return { id: data?.id, to, subject };
};

// ─── Templates ─────────────────────────────────────────────────────────────

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Bienvenue sur Bokoma-Store !',
    html: baseTemplate('Bienvenue 🎉', `
      <p>Bonjour <strong>${user.firstName}</strong>,</p>
      <p>Votre compte a été créé avec succès. Découvrez nos collections !</p>
      <a href="${process.env.CLIENT_URL}" class="btn">Visiter la boutique</a>
    `),
  });

const sendPasswordReset = (user, resetUrl, otpCode) =>
  sendEmail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe',
    html: baseTemplate('Mot de passe oublié ?', `
      <p>Bonjour <strong>${user.firstName}</strong>,</p>
      <p>Utilisez le <strong>code à 6 chiffres</strong> ci-dessous pour réinitialiser
         votre mot de passe. Ce code expire dans <strong>10 minutes</strong>.</p>

      <div style="background:#fafafa;border:2px dashed #1a1a1a;border-radius:8px;
                  padding:20px;margin:20px auto;text-align:center;max-width:320px;">
        <p style="margin:0 0 8px 0;font-size:12px;color:#666;letter-spacing:1px;text-transform:uppercase;">
          Votre code OTP
        </p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;
                    font-family:'Courier New',monospace;color:#1a1a1a;">
          ${otpCode}
        </div>
      </div>

      <p style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" class="btn">Ou cliquez ici pour réinitialiser</a>
      </p>

      <p style="font-size:13px;color:#999">
        Si vous n'avez pas fait cette demande, ignorez cet email.
        Votre mot de passe restera inchangé.
      </p>
    `),
  });

const sendOrderConfirmation = (user, order) =>
  sendEmail({
    to: user.email,
    subject: `Confirmation de commande #${order.orderNumber}`,
    html: baseTemplate('Commande confirmée ✅', `
      <p>Bonjour <strong>${user.firstName}</strong>,</p>
      <p>Votre commande <strong>#${order.orderNumber}</strong> a bien été reçue.</p>
      <p><strong>Total :</strong> ${order.total.toLocaleString('fr-FR')} ${order.currency}</p>
      <a href="${process.env.CLIENT_URL}/orders/${order._id}" class="btn">Suivre ma commande</a>
    `),
  });

const sendOrderStatusUpdate = (user, order) =>
  sendEmail({
    to: user.email,
    subject: `Mise à jour de votre commande #${order.orderNumber}`,
    html: baseTemplate('Statut mis à jour 📦', `
      <p>Bonjour <strong>${user.firstName}</strong>,</p>
      <p>Votre commande <strong>#${order.orderNumber}</strong> est maintenant : <strong>${order.status}</strong>.</p>
      ${order.shipping?.trackingNumber
        ? `<p>Numéro de suivi : <strong>${order.shipping.trackingNumber}</strong></p>` : ''}
      <a href="${process.env.CLIENT_URL}/orders/${order._id}" class="btn">Voir ma commande</a>
    `),
  });

module.exports = {
  sendWelcomeEmail,
  sendPasswordReset,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
};
