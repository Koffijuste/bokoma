// tests/integration/order-create.test.js
// ============================================================================
// 📦 Tests d'intégration — order.service.createOrder (checkout)
// ============================================================================

const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const orderRouter = require('../../src/routes/order.routes');
const { connectTestDB, clearDatabase, generateAuthToken } = require('../helpers/db');
const {
  createUser,
  createCategory,
  createProduct,
  createProductWithVariants,
  createCart,
} = require('../helpers/factories');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Order = require('../../src/models/Order');
const Cart = require('../../src/models/Cart');

// Mock payment-flow.service pour ne pas appeler CinetPay réellement
jest.mock('../../src/services/payment-flow.service', () => ({
  initializeCinetPayPayment: jest.fn(),
  verifyWebhookSignature: jest.fn().mockReturnValue(true),
  computePaymentAmounts: jest.requireActual('../../src/services/payment-flow.service').computePaymentAmounts,
  normalizePhoneNumber: jest.requireActual('../../src/services/payment-flow.service').normalizePhoneNumber,
  resolveCinetPayMethod: jest.requireActual('../../src/services/payment-flow.service').resolveCinetPayMethod,
}));

jest.mock('../../src/services/email.service', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  sendOrderStatusUpdate: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/services/notification.service', () => ({
  notifyCustomer: jest.fn().mockResolvedValue([]),
  notifyAdmins: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue([]),
}));

const paymentFlowService = require('../../src/services/payment-flow.service');

const buildApp = () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api/v1/orders', orderRouter);
  return app;
};

describe('POST /api/v1/orders — Checkout flow', () => {
  let app, user, category, product;

  beforeAll(async () => {
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
    category = await createCategory();
    product = await createProduct(category, { basePrice: 5000, totalStock: 100 });
  });

  const authHeader = () => `Bearer ${generateAuthToken(user)}`;

  const buildOrderPayload = (overrides = {}) => ({
    items: [{
      product: product._id.toString(),
      quantity: 2,
      price: 5000,
      name: product.name,
      image: product.images[0]?.url,
      size: 'M',
      color: 'Noir',
    }],
    shipping: {
      fullName: 'Jean Dupont',
      phone: '+2250707070707',
      street: 'Rue 15',
      city: 'Abidjan',
      country: 'Côte d\'Ivoire',
      method: 'standard',
    },
    payment: {
      method: 'mobile_money',
      details: { operator: 'OM', phoneNumber: '+2250707070707' },
    },
    notes: 'Test order',
    ...overrides,
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Cas valides', () => {
    it('crée une commande + décrémente le stock', async () => {
      paymentFlowService.initializeCinetPayPayment.mockResolvedValueOnce({
        paymentToken: 'mock-token',
        paymentUrl: 'https://secure.cinetpay.net/checkout/mock',
        paymentAmount: 12500,
        remainingAmount: 0,
        isPartialPayment: false,
        cinetpayMethod: 'OM_CI',
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toMatchObject({
        status: 'pending',
        currency: 'XOF',
      });
      expect(res.body.data.order.orderNumber).toMatch(/^CMD-/);
      expect(res.body.data.payment.paymentToken).toBe('mock-token');

      // Stock décrémenté
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.totalStock).toBe(98); // 100 - 2
      expect(updatedProduct.soldCount).toBe(2);
    });

    it('calcule correctement les totaux (subtotal + shipping - discount)', async () => {
      paymentFlowService.initializeCinetPayPayment.mockResolvedValueOnce({
        paymentToken: 'mock-token',
        paymentUrl: 'https://...',
        paymentAmount: 12500,
        remainingAmount: 0,
        isPartialPayment: false,
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload());

      // 2 × 5000 = 10000 (subtotal) + 2500 (standard) = 12500
      expect(res.body.data.order.subtotal).toBe(10000);
      expect(res.body.data.order.shippingCost).toBe(2500);
      expect(res.body.data.order.total).toBe(12500);
    });

    it('calcule correctement le paiement partiel pour cash_on_delivery', async () => {
      paymentFlowService.initializeCinetPayPayment.mockResolvedValueOnce({
        paymentToken: 'mock-token',
        paymentUrl: 'https://...',
        paymentAmount: 6250, // 50% de 12500
        remainingAmount: 6250,
        isPartialPayment: true,
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload({
          payment: { method: 'cash_on_delivery' },
        }));

      expect(res.status).toBe(201);
      expect(res.body.data.payment.isPartialPayment).toBe(true);
      expect(res.body.data.payment.remainingAmount).toBe(6250);
    });

    it('utilise les frais de livraison express (5000 FCFA)', async () => {
      paymentFlowService.initializeCinetPayPayment.mockResolvedValueOnce({
        paymentToken: 'mock-token',
        paymentUrl: 'https://...',
        paymentAmount: 15000,
        remainingAmount: 0,
        isPartialPayment: false,
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload({
          shipping: { ...buildOrderPayload().shipping, method: 'express' },
        }));

      expect(res.body.data.order.shippingCost).toBe(5000);
      expect(res.body.data.order.total).toBe(15000); // 10000 + 5000
    });

    it('utilise les frais pickup (0 FCFA)', async () => {
      paymentFlowService.initializeCinetPayPayment.mockResolvedValueOnce({
        paymentToken: 'mock-token',
        paymentUrl: 'https://...',
        paymentAmount: 10000,
        remainingAmount: 0,
        isPartialPayment: false,
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload({
          shipping: { ...buildOrderPayload().shipping, method: 'pickup' },
        }));

      expect(res.body.data.order.shippingCost).toBe(0);
    });

    it('utilise le panier de l\'utilisateur s\'il existe', async () => {
      await createCart(user._id, [{
        product: product._id,
        price: 5000,
        quantity: 1,
        name: product.name,
      }]);

      paymentFlowService.initializeCinetPayPayment.mockResolvedValueOnce({
        paymentToken: 'mock-token',
        paymentUrl: 'https://...',
        paymentAmount: 7500,
        remainingAmount: 0,
        isPartialPayment: false,
      });

      // Envoie quand même items dans le payload (peut arriver en pratique)
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload());

      // Le panier DB prime sur le payload
      expect(res.body.data.order.subtotal).toBe(5000); // 1 × 5000
    });

    it('rollback le stock si CinetPay échoue', async () => {
      paymentFlowService.initializeCinetPayPayment.mockRejectedValueOnce(
        new Error('CinetPay API down'),
      );

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload());

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Erreur de paiement');

      // Stock NON consommé (rollback effectif)
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.totalStock).toBe(100);
      expect(updatedProduct.soldCount).toBe(0);

      // Commande marquée cancelled
      const order = await Order.findOne({ user: user._id });
      expect(order.status).toBe('cancelled');
      expect(order.payment.status).toBe('failed');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Cas d\'erreur', () => {
    it('rejette sans authentification (401)', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send(buildOrderPayload());

      expect(res.status).toBe(401);
    });

    it('rejette si panier vide (400)', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload({ items: [] }));

      expect(res.status).toBe(422); // express-validator
    });

    it('rejette si stock insuffisant (409)', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload({
          items: [{
            product: product._id.toString(),
            quantity: 200, // > stock
            price: 5000,
            name: product.name,
          }],
        }));

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Stock insuffisant/);
    });

    it('rejette avec une méthode de paiement invalide (422)', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload({
          payment: { method: 'paypal' }, // invalide
        }));

      expect(res.status).toBe(422);
    });

    it('rejette avec un productId invalide (422)', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload({
          items: [{
            product: 'not-a-mongo-id',
            quantity: 1,
            price: 5000,
            name: 'X',
          }],
        }));

      expect(res.status).toBe(422);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Avec variantes', () => {
    it('décrémente la bonne variante', async () => {
      const productWithVariants = await createProductWithVariants(category, [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 5 },
        { size: 'L', stock: 3 },
      ], { basePrice: 6000, totalStock: 18 });

      const variantM = productWithVariants.variants.find((v) => v.size === 'M');

      paymentFlowService.initializeCinetPayPayment.mockResolvedValueOnce({
        paymentToken: 'mock-token',
        paymentUrl: 'https://...',
        paymentAmount: 14500,
        remainingAmount: 0,
        isPartialPayment: false,
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authHeader())
        .send(buildOrderPayload({
          items: [{
            product: productWithVariants._id.toString(),
            variant: variantM._id.toString(),
            quantity: 2,
            price: 6000,
            name: productWithVariants.name,
          }],
        }));

      expect(res.status).toBe(201);

      const updated = await Product.findById(productWithVariants._id);
      const variantMAfter = updated.variants.find((v) => v.size === 'M');
      expect(variantMAfter.stock).toBe(3); // 5 - 2
    });
  });
});