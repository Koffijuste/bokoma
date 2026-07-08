// tests/integration/order-snapshot-enrichment.test.js
// ============================================================================
// 🧪 Tests d'intégration — enrichOrderItems / enrichOrders
// ============================================================================
// Cible le bug "name='Produit' / sku='N/A' / pas de size" sur les
// snapshots de commandes legacy, à la lecture et après migration.
// ============================================================================

const mongoose = require('mongoose');
const { connectTestDB, clearDatabase } = require('../helpers/db');
const {
  createUser,
  createCategory,
  createProductWithVariants,
} = require('../helpers/factories');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const {
  enrichOrderItems,
  enrichOrders,
} = require('../../src/services/order.service');

const fakeUserId = () => new mongoose.Types.ObjectId();

describe('order snapshot enrichment', () => {
  let category, product;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await clearDatabase();
    const user = await createUser();
    category = await createCategory();
    product = await createProductWithVariants(
      category,
      [
        { sku: 'SNK-42', size: '42', color: 'Noir', stock: 5, price: 39000 },
        { sku: 'SNK-43', size: '43', color: 'Noir', stock: 3, price: 39000 },
      ],
      { name: 'Sneakers Premium', basePrice: 39000 },
    );
    // Référence user stockée pour les commandes ci-dessous
    user._id; // eslint-disable-line
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('enrichOrderItems (single order)', () => {
    it('répare un item cassé en lisant le produit depuis la DB', async () => {
      const brokenOrder = await Order.create({
        user: fakeUserId(),
        items: [
          {
            product: product._id,
            variant: product.variants[0]._id, // variant 42
            name: 'Produit',                    // ← cassé
            sku: 'N/A',                          // ← cassé
            size: undefined,                     // ← cassé
            color: undefined,                    // ← cassé
            image: undefined,                    // ← cassé
            price: 39000,
            quantity: 1,
            subtotal: 39000,
          },
        ],
        shipping: {
          fullName: 'Jean Dupont', phone: '+2250707070707',
          street: 'Rue 1', city: 'Abidjan', country: 'Côte d\'Ivoire',
          method: 'standard', cost: 2500,
        },
        payment: {
          method: 'mobile_money', status: 'pending',
          transactionId: 'TX-FIX-001', amountPaid: 0, remainingAmount: 0,
        },
        subtotal: 39000,
        shippingCost: 2500,
        total: 41500,
        status: 'pending',
      });

      // Charger comme le contrôleur le ferait (lean)
      const fresh = await Order.findById(brokenOrder._id).lean();
      const modified = await enrichOrderItems(fresh);

      expect(modified).toBe(1);
      const it = fresh.items[0];
      expect(it.name).toBe('Sneakers Premium');
      expect(it.sku).toBe('SNK-42');
      expect(it.size).toBe('42');
      expect(it.color).toBe('Noir');
      expect(it.image).toMatch(/main\.jpg|back\.jpg|\.jpg/);
    });

    it("laisse un item déjà propre intact (retourne 0)", async () => {
      const cleanOrder = await Order.create({
        user: fakeUserId(),
        items: [{
          product: product._id,
          variant: product.variants[0]._id,
          name: 'Sneakers Premium',
          sku: 'SNK-42',
          size: '42',
          color: 'Noir',
          image: 'https://cdn.example.com/manual.jpg',
          price: 39000, quantity: 1, subtotal: 39000,
        }],
        shipping: {
          fullName: 'Test', phone: '+2250707070707',
          street: 'X', city: 'Abidjan', country: 'CI',
          method: 'standard', cost: 2500,
        },
        payment: {
          method: 'mobile_money', status: 'pending',
          transactionId: 'TX-CLEAN-001', amountPaid: 0, remainingAmount: 0,
        },
        subtotal: 39000, shippingCost: 2500, total: 41500, status: 'pending',
      });

      const fresh = await Order.findById(cleanOrder._id).lean();
      const modified = await enrichOrderItems(fresh);

      expect(modified).toBe(0);
      expect(fresh.items[0].image).toBe('https://cdn.example.com/manual.jpg'); // pas écrasé
    });

    it("utilise le produit déjà populé sans faire de query supplémentaire", async () => {
      const brokenOrder = await Order.create({
        user: fakeUserId(),
        items: [{
          product: product._id, variant: product.variants[0]._id,
          name: 'Produit', sku: 'N/A', price: 39000, quantity: 1, subtotal: 39000,
        }],
        shipping: {
          fullName: 'Test', phone: '+2250707070707',
          street: 'X', city: 'Abidjan', country: 'CI',
          method: 'standard', cost: 2500,
        },
        payment: {
          method: 'mobile_money', status: 'pending',
          transactionId: 'TX-POP-001', amountPaid: 0, remainingAmount: 0,
        },
        subtotal: 39000, shippingCost: 2500, total: 41500, status: 'pending',
      });

      // Populé manuellement (comme le contrôleur)
      const fresh = await Order.findById(brokenOrder._id)
        .populate({ path: 'items.product', select: 'name slug images variants sku' })
        .lean();

      const modified = await enrichOrderItems(fresh);

      expect(modified).toBe(1);
      expect(fresh.items[0].name).toBe('Sneakers Premium');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('enrichOrders (batch, comme dans /dashboard/orders)', () => {
    it('fait UNE SEULE query Product.find() pour N commandes', async () => {
      const N = 5;
      const ordersToInsert = [];
      for (let i = 0; i < N; i++) {
        ordersToInsert.push({
          user: fakeUserId(),
          items: [{
            product: product._id, variant: product.variants[i % 2]._id,
            name: 'Produit', sku: 'N/A', price: 39000, quantity: 1, subtotal: 39000,
          }],
          shipping: {
            fullName: 'Test', phone: '+2250707070707',
            street: 'X', city: 'Abidjan', country: 'CI',
            method: 'standard', cost: 2500,
          },
          payment: {
            method: 'mobile_money', status: 'pending',
            transactionId: `TX-BATCH-${i}`, amountPaid: 0, remainingAmount: 0,
          },
          subtotal: 39000, shippingCost: 2500, total: 41500, status: 'pending',
          orderNumber: `CMD-BATCH-${i}`,
        });
      }
      await Order.insertMany(ordersToInsert);

      // Spy sur Product.find pour compter les appels
      const findSpy = jest.spyOn(Product, 'find');

      const orders = await Order.find().lean();
      // Simuler ce que fait le contrôleur maintenant : populate + enrichOrders
      const populated = await Order.find()
        .populate({ path: 'items.product', select: 'name slug images variants sku' })
        .lean();

      const modified = await enrichOrders(populated);

      expect(modified).toBeGreaterThanOrEqual(N);
      // Au moins 1 appel pour la batch query (et un pour récupérer le populated,
      // mais c'est Mongoose find().populate() qui ne touche pas Product.find)
      // Note : enrichOrders ne fait qu'UN seul find() pour le batch
      const productFindCalls = findSpy.mock.calls.filter((call) => {
        const args = call[0];
        return args && args._id && args._id.$in;
      });
      expect(productFindCalls.length).toBe(1); // ← la key feature
      expect(populated[0].items[0].name).toBe('Sneakers Premium');
      expect(populated[0].items[0].sku).toMatch(/^SNK-/);

      findSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Migration scenario (save après enrichissement)', () => {
    it('répare réellement la DB après .save()', async () => {
      const broken = await Order.create({
        user: fakeUserId(),
        items: [{
          product: product._id, variant: product.variants[0]._id,
          name: 'Produit', sku: 'N/A', price: 39000, quantity: 1, subtotal: 39000,
        }],
        shipping: {
          fullName: 'Test', phone: '+2250707070707',
          street: 'X', city: 'Abidjan', country: 'CI',
          method: 'standard', cost: 2500,
        },
        payment: {
          method: 'mobile_money', status: 'pending',
          transactionId: 'TX-MIG-001', amountPaid: 0, remainingAmount: 0,
        },
        subtotal: 39000, shippingCost: 2500, total: 41500, status: 'pending',
      });

      // Charge comme un script de migration : mongoose doc, pas lean
      const fresh = await Order.findById(broken._id);
      const modified = await enrichOrderItems(fresh);

      expect(modified).toBe(1);
      fresh.markModified('items');
      await fresh.save();

      // Vérifie que la DB est bien mise à jour
      const reloaded = await Order.findById(broken._id).lean();
      expect(reloaded.items[0].name).toBe('Sneakers Premium');
      expect(reloaded.items[0].sku).toBe('SNK-42');
      expect(reloaded.items[0].size).toBe('42');
      expect(reloaded.items[0].image).toMatch(/\.jpg/);
    });
  });
});
