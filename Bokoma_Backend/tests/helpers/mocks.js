// tests/helpers/mocks.js
// ============================================================================
// 🎭 MOCKS — Mocks globaux pour les services externes
// ============================================================================

const crypto = require('crypto');

/**
 * Mock du service paiement CinetPay.
 * Évite les appels HTTP réels et permet de contrôler les réponses.
 */
const mockPaymentService = () => {
  jest.mock('../../src/services/payment.service', () => {
    return jest.fn().mockImplementation(() => ({
      isConfigured: jest.fn().mockReturnValue(true),
      getAccessToken: jest.fn().mockResolvedValue('mock-token'),
      authenticate: jest.fn().mockResolvedValue('mock-token'),
      initializePayment: jest.fn().mockResolvedValue({
        success: true,
        paymentToken: 'mock-payment-token-12345',
        paymentUrl: 'https://secure.cinetpay.net/checkout/mock-payment-token-12345',
        transactionId: 'CMD-MOCK-12345',
        notifyToken: 'mock-notify-token',
      }),
      verifyPayment: jest.fn().mockResolvedValue({
        success: true,
        status: 'SUCCESS',
        amount: 5000,
        transactionId: 'CMD-MOCK-12345',
      }),
    }));
  });
};

/**
 * Mock du service email — évite l'envoi réel.
 */
const mockEmailService = () => {
  jest.mock('../../src/services/email.service', () => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendOrderStatusUpdate: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  }));
};

/**
 * Mock du service notification.
 */
const mockNotificationService = () => {
  jest.mock('../../src/services/notification.service', () => ({
    notifyCustomer: jest.fn().mockResolvedValue([]),
    notifyAdmins: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue([]),
    getUserNotifications: jest.fn().mockResolvedValue([]),
    markAsRead: jest.fn().mockResolvedValue(null),
    markAllAsRead: jest.fn().mockResolvedValue(null),
    countUnread: jest.fn().mockResolvedValue(0),
  }));
};

/**
 * Mock Cloudinary (upload).
 */
const mockCloudinary = () => {
  jest.mock('cloudinary', () => ({
    v2: {
      uploader: {
        upload: jest.fn().mockResolvedValue({
          public_id: 'mock-public-id',
          secure_url: 'https://res.cloudinary.com/mock/image.jpg',
        }),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
      },
      config: jest.fn(),
    },
  }));
};

/**
 * Mock Nodemailer.
 */
const mockNodemailer = () => {
  jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
    }),
  }));
};

/**
 * Génère une signature HMAC-SHA256 valide pour un body donné.
 * Utilisé pour les tests webhook.
 */
const generateWebhookSignature = (body, secret = process.env.CINETPAY_API_PASSWORD_CI) => {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

/**
 * Configure tous les mocks d'un coup.
 */
const setupAllMocks = () => {
  mockEmailService();
  mockNotificationService();
  mockCloudinary();
  mockNodemailer();
  // Note: payment.service est mocké sélectivement dans les tests
  // qui en ont besoin (pour pouvoir contrôler les réponses).
};

module.exports = {
  mockPaymentService,
  mockEmailService,
  mockNotificationService,
  mockCloudinary,
  mockNodemailer,
  setupAllMocks,
  generateWebhookSignature,
};