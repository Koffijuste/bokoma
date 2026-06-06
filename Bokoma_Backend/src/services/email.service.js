const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
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

const sendPasswordReset = (user, resetUrl) =>
  sendEmail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe',
    html: baseTemplate('Mot de passe oublié ?', `
      <p>Bonjour <strong>${user.firstName}</strong>,</p>
      <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe.
         Ce lien expire dans <strong>10 minutes</strong>.</p>
      <a href="${resetUrl}" class="btn">Réinitialiser mon mot de passe</a>
      <p style="font-size:13px;color:#999">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
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