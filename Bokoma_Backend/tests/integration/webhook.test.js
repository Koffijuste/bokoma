// tests/integration/webhook.test.js
// ============================================================================
// 🔔 Tests d'intégration — Webhook CinetPay (signature HMAC + flow)
// ============================================================================

const crypto = require('crypto');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const webhookRouter = require('../../src/routes/webhook.routes');
const { connectTestDB, clearDatabase } = require('../helpers/db');
const { createUser, createOrder } = require('../helpers/factories');

// Mock du payment.service pour contrôler verifyPayment
jest.mock('../../src/services/payment.service', () => {
  return jest.fn().mockImplementation(() => ({
    isConfigured: jest.fn().mockReturnValue(true),
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    verifyPayment: jest.fn(),
  }));
});

jest.mock('../../src/services/notification.service', () => ({
  notifyCustomer: jest.fn().mockResolvedValue([]),
  notifyAdmins: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue([]),
  getUserNotifications: jest.fn().mockResolvedValue([]),
  markAsRead: jest.fn().mockResolvedValue(null),
  markAllAsRead: jest.fn().mockResolvedValue(null),
  countUnread: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../src/services/email.service', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  sendOrderStatusUpdate: jest.fn().mockResolvedValue(true),
}));

const paymentService = require('../../src/services/payment.service');

// Crée une mini-app Express avec le raw body parser, comme dans server.js
const buildApp = () => {
  const app = express();
  // Important : raw body parser AVANT les routes
  app.use(
    '/api/v1/webhook',
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => { req.rawBody = buf; },
    }),
  );
  app.use('/api/v1/webhook', webhookRouter);
  return app;
};

const SECRET = 'test-webhook-secret-abc123';

describe('Webhook CinetPay — intégration', () => {
  let app;
  let user;
  let order;

  beforeAll(async () => {
    process.env.CINETPAY_API_PASSWORD_CI = SECRET;
    app = buildApp();
    await connectTestDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    user = await createUser();
    order = await createOrder(user, {
      payment: {
        method: 'mobile_money',
        status: 'pending',
        transactionId: 'CMD-TEST-WEBHOOK-001',
        provider: 'cinetpay',
        amountPaid: 0,
        remainingAmount: 5000,
      },
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Sécurité — vérification de signature', () => {
    it('rejette avec 401 sans signature', async () => {
      const body = {
        transaction_id: 'CMD-TEST-WEBHOOK-001',
        status: 'ACCEPTED',
        amount: 5000,
      };

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .send(body);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        success: false,
      });
    });

    it('rejette avec 401 si signature invalide', async () => {
      const body = {
        transaction_id: 'CMD-TEST-WEBHOOK-001',
        status: 'ACCEPTED',
        amount: 5000,
      };
      const bodyStr = JSON.stringify(body);
      const wrongSig = crypto.createHmac('sha256', 'WRONG-SECRET').update(bodyStr).digest('hex');

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', wrongSig)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(401);
    });

    it('accepte avec signature valide', async () => {
      const body = {
        transaction_id: 'CMD-TEST-WEBHOOK-001',
        status: 'ACCEPTED',
        amount: 5000,
        timestamp: new Date().toISOString(),
      };
      const bodyStr = JSON.stringify(body);
      const sig = crypto.createHmac('sha256', SECRET).update(bodyStr).digest('hex');

      // Mock verifyPayment pour confirmer le paiement
      paymentService.mock.results[0].value.verifyPayment.mockResolvedValueOnce({
        success: true,
        status: 'SUCCESS',
      });

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('la signature est sensible au body — modifier le body casse la signature', async () => {
      const originalBody = {
        transaction_id: 'CMD-TEST-WEBHOOK-001',
        status: 'ACCEPTED',
        amount: 5000,
      };
      const originalSig = crypto.createHmac('sha256', SECRET)
        .update(JSON.stringify(originalBody))
        .digest('hex');

      // Envoie le même sig mais avec un body modifié
      const tamperedBody = { ...originalBody, amount: 99999 };

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', originalSig)
        .set('Content-Type', 'application/json')
        .send(tamperedBody);

      expect(res.status).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Flow — paiement accepté', () => {
    it('marque la commande comme paid + confirmed', async () => {
      const body = {
        transaction_id: 'CMD-TEST-WEBHOOK-001',
        status: 'ACCEPTED',
        amount: 5000,
        timestamp: new Date().toISOString(),
      };
      const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

      paymentService.mock.results[0].value.verifyPayment.mockResolvedValueOnce({
        success: true,
        status: 'SUCCESS',
      });

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(200);

      const updatedOrder = await mongoose.connection.db
        .collection('orders')
        .findOne({ _id: order._id });

      expect(updatedOrder.payment.status).toBe('paid');
      expect(updatedOrder.status).toBe('confirmed');
      expect(updatedOrder.payment.amountPaid).toBe(5000);
    });

    it('évite le double-traitement (idempotence)', async () => {
      // Premier appel
      order.payment.status = 'paid';
      order.status = 'confirmed';
      await order.save();

      const body = {
        transaction_id: 'CMD-TEST-WEBHOOK-001',
        status: 'ACCEPTED',
        amount: 5000,
      };
      const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Déjà traité');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Flow — paiement refusé', () => {
    it('annule la commande + restaure le stock', async () => {
      // Décrémenter le stock manuellement pour simuler une commande en cours
      const Product = require('../../src/models/Product');
      const category = await require('../helpers/factories').createCategory();
      const product = await require('../helpers/factories').createProduct(category, { totalStock: 50 });
      order.items[0].product = product._id;
      await order.save();
      await require('../../src/services/inventory.service').decrementStock(order.items);
      expect((await Product.findById(product._id)).totalStock).toBe(48);

      const body = {
        transaction_id: 'CMD-TEST-WEBHOOK-001',
        status: 'REFUSED',
        amount: 5000,
      };
      const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

      paymentService.mock.results[0].value.verifyPayment.mockResolvedValueOnce({
        success: false,
        status: 'REFUSED',
      });

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(200);

      const updatedOrder = await mongoose.connection.db
        .collection('orders')
        .findOne({ _id: order._id });
      expect(updatedOrder.payment.status).toBe('failed');
      expect(updatedOrder.status).toBe('cancelled');

      // Stock restauré
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.totalStock).toBe(50);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Robustesse', () => {
    it('retourne 400 si transaction_id ET order_id manquants', async () => {
      const body = { status: 'ACCEPTED' };
      const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(400);
    });

    it('retourne 404 si la commande n\'existe pas', async () => {
      const body = {
        transaction_id: 'CMD-UNKNOWN-999',
        status: 'ACCEPTED',
      };
      const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(404);
    });

    it('retourne 200 même en cas d\'erreur interne (évite retry infini CinetPay)', async () => {
      // Force une erreur côté MongoDB en déconnectant avant le call
      const body = {
        transaction_id: 'CMD-TEST-WEBHOOK-001',
        status: 'ACCEPTED',
      };
      const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

      paymentService.mock.results[0].value.verifyPayment.mockRejectedValueOnce(
        new Error('API CinetPay down'),
      );

      const res = await request(app)
        .post('/api/v1/webhook/cinetpay')
        .set('x-cinetpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(body);

      // Reste 200 pour éviter le retry infini côté CinetPay
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });
  });
});