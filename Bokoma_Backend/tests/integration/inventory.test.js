// tests/integration/inventory.test.js
// ============================================================================
// 📦 Tests d'intégration — inventory.service (opérations atomiques de stock)
// ============================================================================

const mongoose = require('mongoose');
const {
  connectTestDB,
  clearDatabase,
} = require('../helpers/db');
const {
  createCategory,
  createProduct,
  createProductWithVariants,
} = require('../helpers/factories');
const {
  decrementStock,
  restoreStock,
  checkAvailability,
} = require('../../src/services/inventory.service');
const Product = require('../../src/models/Product');

describe('inventory.service', () => {
  let category;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await clearDatabase();
    category = await createCategory();
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('decrementStock', () => {
    it('décrémente le stock d\'un produit sans variante', async () => {
      const product = await createProduct(category, { totalStock: 100 });

      await decrementStock([{ product: product._id, quantity: 3 }]);

      const updated = await Product.findById(product._id);
      expect(updated.totalStock).toBe(97);
      expect(updated.soldCount).toBe(3);
    });

    it('décrémente le stock d\'une variante spécifique', async () => {
      const product = await createProductWithVariants(category, [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 5 },
      ], { totalStock: 15 });

      const variantM = product.variants.find((v) => v.size === 'M');

      await decrementStock([{
        product: product._id,
        variant: variantM._id,
        quantity: 2,
      }]);

      const updated = await Product.findById(product._id);
      const variantMAfter = updated.variants.find((v) => v.size === 'M');
      const variantSAfter = updated.variants.find((v) => v.size === 'S');

      expect(variantMAfter.stock).toBe(3);
      expect(variantSAfter.stock).toBe(10); // pas touché
    });

    it('incrémente soldCount', async () => {
      const product = await createProduct(category, { totalStock: 50 });

      await decrementStock([{ product: product._id, quantity: 5 }]);
      await decrementStock([{ product: product._id, quantity: 3 }]);

      const updated = await Product.findById(product._id);
      expect(updated.soldCount).toBe(8);
    });

    it('empêche l\'overselling lors de décréments concurrents', async () => {
      const product = await createProduct(category, { totalStock: 5 });

      const results = await Promise.allSettled([
        decrementStock([{ product: product._id, quantity: 3 }]),
        decrementStock([{ product: product._id, quantity: 3 }]),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

      const updated = await Product.findById(product._id);
      expect(updated.totalStock).toBe(2);
      expect(updated.soldCount).toBe(3);
    });

    it('rejette si stock insuffisant (variante)', async () => {
      const product = await createProductWithVariants(category, [
        { size: 'L', stock: 1 },
      ]);

      await expect(
        decrementStock([{
          product: product._id,
          variant: product.variants[0]._id,
          quantity: 5,
        }]),
      ).rejects.toThrow(/Stock insuffisant/);

      // Le stock ne doit pas avoir changé
      const updated = await Product.findById(product._id);
      expect(updated.variants[0].stock).toBe(1);
    });

    it('rejette si produit introuvable', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        decrementStock([{ product: fakeId, quantity: 1 }]),
      ).rejects.toThrow(/Produit introuvable/);
    });

    it('rejette si variante introuvable', async () => {
      const product = await createProduct(category);
      const fakeVariantId = new mongoose.Types.ObjectId();

      await expect(
        decrementStock([{
          product: product._id,
          variant: fakeVariantId,
          quantity: 1,
        }]),
      ).rejects.toThrow(/Variante introuvable/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('restoreStock', () => {
    it('réintègre le stock d\'un produit sans variante', async () => {
      const product = await createProduct(category, { totalStock: 50 });

      await restoreStock([{ product: product._id, quantity: 5 }]);

      const updated = await Product.findById(product._id);
      expect(updated.totalStock).toBe(55);
    });

    it('réintègre le stock d\'une variante', async () => {
      const product = await createProductWithVariants(category, [
        { size: 'M', stock: 5 },
      ], { totalStock: 5 });

      const variantM = product.variants[0];

      await restoreStock([{
        product: product._id,
        variant: variantM._id,
        quantity: 3,
      }]);

      const updated = await Product.findById(product._id);
      expect(updated.variants[0].stock).toBe(8);
    });

    it('décrémente soldCount en conséquence', async () => {
      const product = await createProduct(category, { totalStock: 50 });
      await decrementStock([{ product: product._id, quantity: 10 }]);

      let updated = await Product.findById(product._id);
      expect(updated.soldCount).toBe(10);

      await restoreStock([{ product: product._id, quantity: 4 }]);
      updated = await Product.findById(product._id);
      expect(updated.soldCount).toBe(6);
      expect(updated.totalStock).toBe(44);
    });

    it('ne descend pas soldCount en dessous de 0', async () => {
      const product = await createProduct(category, { totalStock: 50 });

      await restoreStock([{ product: product._id, quantity: 5 }]);

      const updated = await Product.findById(product._id);
      expect(updated.soldCount).toBe(0);
    });

    it('ignore silencieusement si produit supprimé', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      // Ne doit pas throw
      await expect(
        restoreStock([{ product: fakeId, quantity: 5 }]),
      ).resolves.toBeUndefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('checkAvailability (sans modification)', () => {
    it('retourne [] si tout est dispo', async () => {
      const product = await createProduct(category, { totalStock: 100 });

      const outOfStock = await checkAvailability([
        { product: product._id, quantity: 5 },
      ]);

      expect(outOfStock).toHaveLength(0);

      // Stock NON modifié
      const updated = await Product.findById(product._id);
      expect(updated.totalStock).toBe(100);
    });

    it('retourne les items en rupture', async () => {
      const product = await createProduct(category, { totalStock: 2 });

      const outOfStock = await checkAvailability([
        { product: product._id, quantity: 5 },
      ]);

      expect(outOfStock).toHaveLength(1);
      expect(outOfStock[0].available).toBe(2);
      expect(outOfStock[0].name).toBe(product.name);
    });

    it('détecte les ruptures par variante', async () => {
      const product = await createProductWithVariants(category, [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 1 },
      ], { totalStock: 11 });

      const variantM = product.variants.find((v) => v.size === 'M');

      const outOfStock = await checkAvailability([{
        product: product._id,
        variant: variantM._id,
        quantity: 3,
      }]);

      expect(outOfStock).toHaveLength(1);
      expect(outOfStock[0].available).toBe(1);
    });

    it('signale un produit introuvable', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const outOfStock = await checkAvailability([
        { product: fakeId, quantity: 1 },
      ]);

      expect(outOfStock).toHaveLength(1);
      expect(outOfStock[0].reason).toBe('Produit introuvable');
    });
  });
});