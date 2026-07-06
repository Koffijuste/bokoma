// tests/unit/order-formatter.test.js
// ============================================================================
// 📦 Tests unitaires — formatters/order.formatter.js
// ============================================================================

const {
  formatOrderForClient,
  formatOrderItem,
  formatShipping,
  formatPayment,
  formatOrderList,
  formatOrderForPublic,
} = require('../../src/formatters/order.formatter');

const fakeOrderObjectId = '507f1f77bcf86cd799439011';
const fakeUserId = '507f191e810c19729de860ea';
const fakeProductId = '507f1f77bcf86cd799439012';

const buildOrderMock = (overrides = {}) => {
  const order = {
    _id: fakeOrderObjectId,
    orderNumber: 'CMD-ABC123',
    status: 'confirmed',
    subtotal: 10000,
    shippingCost: 2500,
    discount: 0,
    tax: 0,
    total: 12500,
    currency: 'XOF',
    notes: 'Livraison rapide svp',
    cancelReason: null,
    items: [
      {
        _id: 'item1',
        product: {
          _id: fakeProductId,
          name: 'T-shirt Premium',
          slug: 't-shirt-premium',
          basePrice: 5000,
          description: 'Coton bio',
          images: [{ url: 'https://img/1.jpg' }],
        },
        variant: null,
        name: 'T-shirt Premium',
        sku: 'TSH-001',
        image: 'https://img/1.jpg',
        size: 'M',
        color: 'Noir',
        quantity: 2,
        price: 5000,
        subtotal: 10000,
      },
    ],
    user: {
      _id: fakeUserId,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@test.ci',
      phone: '+2250707070707',
      avatar: 'https://avatar.jpg',
    },
    shipping: {
      fullName: 'Jean Dupont',
      phone: '+2250707070707',
      street: 'Rue 1',
      city: 'Abidjan',
      postalCode: '00225',
      country: 'CI',
      method: 'standard',
      cost: 2500,
      carrier: null,
      trackingNumber: null,
      estimatedAt: null,
      deliveredAt: null,
    },
    payment: {
      method: 'mobile_money',
      status: 'paid',
      provider: 'cinetpay',
      transactionId: 'CMD-TX-001',
      amountPaid: 12500,
      remainingAmount: 0,
      paidAt: new Date('2024-01-15'),
      failedAt: null,
      expiredAt: null,
      rejectionReason: null,
      details: { cardLast4: '1234' }, // NE DOIT PAS apparaître
    },
    coupon: null,
    statusHistory: [{ status: 'pending' }, { status: 'confirmed' }],
    paymentExpiresAt: new Date('2024-01-15'),
    archivedByUser: false,
    archivedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    toObject: function () { return this; },
    ...overrides,
  };
  return order;
};

describe('order.formatter', () => {
  // ───────────────────────────────────────────────────────────────────────
  describe('formatOrderForClient', () => {
    it('formate tous les champs attendus', () => {
      const order = buildOrderMock();
      const formatted = formatOrderForClient(order);

      expect(formatted._id).toBe(fakeOrderObjectId);
      expect(formatted.orderNumber).toBe('CMD-ABC123');
      expect(formatted.status).toBe('confirmed');
      expect(formatted.total).toBe(12500);
      expect(formatted.currency).toBe('XOF');
      expect(formatted.user.name).toBe('Jean Dupont');
      expect(formatted.items).toHaveLength(1);
      expect(formatted.shipping.city).toBe('Abidjan');
    });

    it('masque les détails sensibles du paiement (cardLast4)', () => {
      const order = buildOrderMock();
      const formatted = formatOrderForClient(order);

      expect(formatted.payment.details).toBeUndefined();
      expect(formatted.payment.method).toBe('mobile_money');
      expect(formatted.payment.status).toBe('paid');
    });

    it('détecte le paiement partiel via remainingAmount', () => {
      const order = buildOrderMock({
        payment: {
          method: 'cash_on_delivery',
          status: 'pending',
          amountPaid: 5000,
          remainingAmount: 7500,
        },
      });
      const formatted = formatOrderForClient(order);

      expect(formatted.payment.isPartialPayment).toBe(true);
      expect(formatted.payment.remainingAmount).toBe(7500);
    });

    it('gère un user null (commande anonyme)', () => {
      const order = buildOrderMock({ user: null });
      const formatted = formatOrderForClient(order);

      expect(formatted.user).toBeNull();
    });

    it('retourne null si order est null', () => {
      expect(formatOrderForClient(null)).toBeNull();
    });

    it('convertit les _id en string', () => {
      const order = buildOrderMock();
      const formatted = formatOrderForClient(order);

      expect(typeof formatted._id).toBe('string');
      expect(typeof formatted.user._id).toBe('string');
      expect(typeof formatted.items[0]._id).toBe('string');
      expect(typeof formatted.items[0].product._id).toBe('string');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('formatOrderItem', () => {
    it('formate un item simple', () => {
      const item = formatOrderItem({
        _id: 'item1',
        name: 'Produit X',
        price: 1000,
        quantity: 2,
        subtotal: 2000,
      });

      expect(item.name).toBe('Produit X');
      expect(item.price).toBe(1000);
      expect(item.subtotal).toBe(2000);
    });

    it('retourne null si item null', () => {
      expect(formatOrderItem(null)).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('formatShipping', () => {
    it('préserve tous les champs', () => {
      const shipping = formatShipping({
        fullName: 'Test',
        city: 'Abidjan',
        method: 'express',
        cost: 5000,
      });

      expect(shipping.city).toBe('Abidjan');
      expect(shipping.method).toBe('express');
      expect(shipping.cost).toBe(5000);
    });

    it('retourne null si shipping null', () => {
      expect(formatShipping(null)).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('formatPayment', () => {
    it('expose les infos publiques', () => {
      const payment = formatPayment({
        method: 'card',
        status: 'paid',
        transactionId: 'TX-123',
        amountPaid: 10000,
        remainingAmount: 0,
        details: { cardLast4: '1234', cvv: '999' }, // sensible
      });

      expect(payment.transactionId).toBe('TX-123');
      expect(payment.status).toBe('paid');
      expect(payment.details).toBeUndefined(); // masqué
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('formatOrderList', () => {
    it('calcule correctement la pagination', () => {
      const orders = [buildOrderMock(), buildOrderMock()];
      const result = formatOrderList(orders, 25, 1, 10);

      expect(result.orders).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.pages).toBe(3); // ceil(25/10)
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('gère la dernière page', () => {
      const result = formatOrderList([buildOrderMock()], 25, 3, 10);

      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('formatOrderForPublic', () => {
    it('masque les données utilisateur sensibles', () => {
      const order = buildOrderMock().toObject();
      const publicOrder = formatOrderForPublic(order);

      // Pas d'email ni phone dans la version publique
      expect(publicOrder.shipping).not.toHaveProperty('email');
      expect(publicOrder.user).toBeUndefined();
      // Mais shipping est OK (fullName + phone + adresse pour livraison)
      expect(publicOrder.shipping.fullName).toBe('Jean Dupont');
    });

    it('inclut les items avec image de fallback', () => {
      const order = buildOrderMock().toObject();
      const publicOrder = formatOrderForPublic(order);

      expect(publicOrder.items[0].image).toBeDefined();
      expect(publicOrder.items[0].product.slug).toBe('t-shirt-premium');
    });
  });
});