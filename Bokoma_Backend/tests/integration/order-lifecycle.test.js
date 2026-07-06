// tests/integration/order-lifecycle.test.js
// ============================================================================
// 📦 Tests d'intégration — cancelOrder, markAsDelivered, archiveOrder
// ============================================================================

const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const orderRouter = require('../../src/routes/order.routes');
const { connectTestDB, clearDatabase, generateAuthToken } = require('../helpers/db');
const { createUser, createCategory, createProduct, createOrder } = require('../helpers/factories');
const Product = require('../../src/models/Product');

jest.mock('../../src/services/email.service', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  sendOrderStatusUpdate: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/services/notification.service', () => ({
  notifyCustomer: jest.fn().mockResolvedValue([]),
  notifyAdmins: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue([]),
}));

const buildApp = () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api/v1/orders', orderRouter);
  return app;
};

describe('Cycle de vie d\'une commande', () => {
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
    user = await createUser();
    category = await createCategory();
    product = await createProduct(category, { totalStock: 50 });

    // Décrémenter le stock comme si la commande était déjà payée
    product.totalStock = 47;
    product.soldCount = 3;
    await product.save();
  });

  const authHeader = (u = user) => `Bearer ${generateAuthToken(u)}`;

  // ───────────────────────────────────────────────────────────────────────
  describe('PATCH /:id/cancel', () => {
    it('annule la commande + restaure le stock', async () => {
      const order = await createOrder(user, {
        items: [{
          product: product._id,
          name: product.name,
          sku: 'TEST-001',
          price: 5000,
          quantity: 3,
          subtotal: 15000,
        }],
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', authHeader())
        .send({ reason: 'Client a changé d\'avis' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('cancelled');

      // Stock restauré
      const updated = await Product.findById(product._id);
      expect(updated.totalStock).toBe(50);
      expect(updated.soldCount).toBe(0);
    });

    it('rejette 403 si la commande appartient à un autre user', async () => {
      const otherUser = await createUser();
      const order = await createOrder(otherUser);

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', authHeader())
        .send({ reason: 'Test' });

      expect(res.status).toBe(403);
    });

    it('rejette 400 si déjà annulée', async () => {
      const order = await createOrder(user, { status: 'cancelled' });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', authHeader())
        .send({ reason: 'Test' });

      expect(res.status).toBe(400);
    });

    it('rejette 400 si déjà expédiée', async () => {
      const order = await createOrder(user, { status: 'shipped' });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', authHeader())
        .send({ reason: 'Test' });

      expect(res.status).toBe(400);
    });

    it('rejette 404 si commande inexistante', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/v1/orders/${fakeId}/cancel`)
        .set('Authorization', authHeader())
        .send({ reason: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('PATCH /:id/archive', () => {
    it('archive la commande (visible dans archivedByUser)', async () => {
      const order = await createOrder(user, { status: 'delivered' });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/archive`)
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);

      // Vérifie en DB
      const archivedOrder = await mongoose.connection.db
        .collection('orders')
        .findOne({ _id: order._id });
      expect(archivedOrder.archivedByUser).toBe(true);
      expect(archivedOrder.archivedAt).toBeDefined();
    });

    it('exclut les commandes archivées de GET /my', async () => {
      const orderActive = await createOrder(user, { status: 'delivered' });
      const orderArchived = await createOrder(user, { status: 'delivered' });

      // Archive la 2ème
      await request(app)
        .patch(`/api/v1/orders/${orderArchived._id}/archive`)
        .set('Authorization', authHeader());

      const res = await request(app)
        .get('/api/v1/orders/my')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      const orderNumbers = res.body.data.orders.map((o) => o.orderNumber);
      expect(orderNumbers).toContain(orderActive.orderNumber);
      expect(orderNumbers).not.toContain(orderArchived.orderNumber);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('PATCH /:id/delivered', () => {
    it('confirme la livraison par le client', async () => {
      const order = await createOrder(user, { status: 'confirmed' });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/delivered`)
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('delivered');
      expect(res.body.data.order.deliveredAt).toBeDefined();
    });

    it('rejette si le statut actuel n\'est pas "confirmed"', async () => {
      const order = await createOrder(user, { status: 'shipped' });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/delivered`)
        .set('Authorization', authHeader());

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/confirmées/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('GET /my', () => {
    it('liste les commandes du user connecté', async () => {
      await createOrder(user, { status: 'delivered' });
      await createOrder(user, { status: 'pending' });

      const res = await request(app)
        .get('/api/v1/orders/my')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data.orders).toHaveLength(2);
      expect(res.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
    });

    it('filtre par statut', async () => {
      await createOrder(user, { status: 'delivered' });
      await createOrder(user, { status: 'pending' });
      await createOrder(user, { status: 'cancelled' });

      const res = await request(app)
        .get('/api/v1/orders/my?status=delivered')
        .set('Authorization', authHeader());

      expect(res.body.data.orders).toHaveLength(1);
      expect(res.body.data.orders[0].status).toBe('delivered');
    });

    it('pagine correctement', async () => {
      for (let i = 0; i < 15; i++) {
        await createOrder(user, { status: 'delivered' });
      }

      const page1 = await request(app)
        .get('/api/v1/orders/my?page=1&limit=10')
        .set('Authorization', authHeader());

      const page2 = await request(app)
        .get('/api/v1/orders/my?page=2&limit=10')
        .set('Authorization', authHeader());

      expect(page1.body.data.orders).toHaveLength(10);
      expect(page2.body.data.orders).toHaveLength(5);
      expect(page1.body.data.pagination.hasNext).toBe(true);
      expect(page2.body.data.pagination.hasNext).toBe(false);
    });

    it('rejette sans auth', async () => {
      const res = await request(app).get('/api/v1/orders/my');
      expect(res.status).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('GET /:id', () => {
    it('retourne les détails d\'une commande', async () => {
      const order = await createOrder(user, { status: 'delivered' });

      const res = await request(app)
        .get(`/api/v1/orders/${order._id}`)
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderNumber).toBe(order.orderNumber);
      expect(res.body.data.order.user.email).toBe(user.email);
    });

    it('rejette 403 si pas le propriétaire', async () => {
      const otherUser = await createUser();
      const order = await createOrder(otherUser);

      const res = await request(app)
        .get(`/api/v1/orders/${order._id}`)
        .set('Authorization', authHeader());

      expect(res.status).toBe(403);
    });

    it('autorise l\'admin à voir toutes les commandes', async () => {
      const admin = await createUser({ role: 'admin' });
      const order = await createOrder(user);

      const res = await request(app)
        .get(`/api/v1/orders/${order._id}`)
        .set('Authorization', authHeader(admin));

      expect(res.status).toBe(200);
    });
  });
});