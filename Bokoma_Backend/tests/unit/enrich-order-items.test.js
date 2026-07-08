// tests/unit/enrich-order-items.test.js
// ============================================================================
// 🧪 Tests unitaires — enrichSingleItem (logique pure, sans DB)
// ============================================================================

const {
  enrichSingleItem,
} = require('../../src/services/order.service');

const newObjectId = () => '507f1f77bcf86cd7994390' + Math.floor(Math.random() * 100).toString().padStart(2, '0');

describe('enrichSingleItem', () => {
  const productWithVariants = {
    _id: newObjectId(),
    name: 'Sneakers Premium',
    slug: 'sneakers-premium',
    sku: 'PROD-SNK',
    images: [
      { url: 'https://cdn.example.com/main.jpg', isPrimary: true },
      { url: 'https://cdn.example.com/back.jpg' },
    ],
    variants: [
      { _id: newObjectId(), sku: 'SNK-42-NOIR', size: '42', color: 'Noir', stock: 5, price: 39000 },
      { _id: newObjectId(), sku: 'SNK-43-NOIR', size: '43', color: 'Noir', stock: 3, price: 39000 },
    ],
  };

  // ───────────────────────────────────────────────────────────────────────
  describe('Cas cassés (legacy buggy)', () => {
    it('remplace name="Produit" par le vrai nom', () => {
      const item = { name: 'Produit', sku: 'N/A', price: 1000, quantity: 1 };
      const result = enrichSingleItem(item, productWithVariants);

      expect(result).toBe(true);
      expect(item.name).toBe('Sneakers Premium');
    });

    it('remplace sku="N/A" par le SKU de la variant matchée via _id', () => {
      const variantId = productWithVariants.variants[0]._id;
      const item = {
        name: 'Produit',
        sku: 'N/A',
        price: 1000,
        quantity: 1,
        variant: variantId,
      };
      const result = enrichSingleItem(item, productWithVariants);

      expect(result).toBe(true);
      expect(item.sku).toBe('SNK-42-NOIR');
    });

    it("récupère size depuis la variant matchée par son SKU stocké", () => {
      const item = {
        name: 'Produit',
        sku: 'SNK-43-NOIR',
        price: 1000,
        quantity: 1,
        variant: null,
      };
      const result = enrichSingleItem(item, productWithVariants);

      expect(result).toBe(true);
      expect(item.size).toBe('43');
      expect(item.color).toBe('Noir');
    });

    it('récupère size/color depuis la variant populée (objet)', () => {
      const item = {
        name: 'Produit',
        sku: 'SNK-42-NOIR',
        size: null,
        color: null,
        price: 1000,
        quantity: 1,
        variant: { _id: productWithVariants.variants[0]._id, size: '42', color: 'Noir' },
      };
      const result = enrichSingleItem(item, productWithVariants);

      expect(result).toBe(true);
      expect(item.size).toBe('42');
      expect(item.color).toBe('Noir');
    });

    it('récupère image depuis product.images (primaire)', () => {
      const item = { name: 'Produit', sku: 'N/A', price: 1000, quantity: 1, image: null };
      const result = enrichSingleItem(item, productWithVariants);

      expect(result).toBe(true);
      expect(item.image).toBe('https://cdn.example.com/main.jpg');
    });

    it('récupère image quand images[0] est une string', () => {
      const product = {
        ...productWithVariants,
        images: ['https://cdn.example.com/raw.jpg'],
      };
      const item = { name: 'Produit', sku: 'N/A', image: null };
      const result = enrichSingleItem(item, product);

      expect(result).toBe(true);
      expect(item.image).toBe('https://cdn.example.com/raw.jpg');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Cas propres (ne touche pas aux valeurs existantes)', () => {
    it('retourne false si rien à patcher', () => {
      const item = {
        name: 'Sneakers Premium',
        sku: 'SNK-42-NOIR',
        size: '42',
        color: 'Noir',
        image: 'https://cdn.example.com/main.jpg',
        price: 39000,
        quantity: 1,
      };
      const result = enrichSingleItem(item, productWithVariants);

      expect(result).toBe(false);
    });

    it('ne touche jamais à price / quantity', () => {
      const item = {
        name: 'Produit', sku: 'N/A', size: null, color: null, image: null,
        price: 12345, quantity: 7,
      };
      enrichSingleItem(item, productWithVariants);

      expect(item.price).toBe(12345);
      expect(item.quantity).toBe(7);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Idempotence', () => {
    it('deux appels consécutifs = même résultat, retourne false au 2e', () => {
      const item = { name: 'Produit', sku: 'N/A', size: null, image: null, price: 1000, quantity: 1 };
      const first = enrichSingleItem(item, productWithVariants);
      const second = enrichSingleItem(item, productWithVariants);

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(item.name).toBe('Sneakers Premium');
      expect(item.sku).toBe('SNK-42-NOIR'); // variant 42 matche par défaut
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Robustesse', () => {
    it("ne lève pas d'erreur sur un item sans product", () => {
      const item = { name: 'Produit', sku: 'N/A' };
      expect(() => enrichSingleItem(item, null)).not.toThrow();
      expect(enrichSingleItem(item, null)).toBe(false);
    });

    it('utilise le sku du produit en dernier recours', () => {
      const productNoVariants = {
        ...productWithVariants,
        sku: 'PROD-SANS-VARIANT',
        variants: [],
      };
      const item = { name: 'Produit', sku: 'N/A', price: 1000 };
      const result = enrichSingleItem(item, productNoVariants);

      expect(result).toBe(true);
      expect(item.sku).toBe('PROD-SANS-VARIANT');
    });

    it('utilise la première variant comme dernier recours pour le sku', () => {
      const productWithSkuOnFirstVariant = {
        ...productWithVariants,
        sku: undefined,
      };
      const item = { name: 'Produit', sku: 'N/A', price: 1000 };
      const result = enrichSingleItem(item, productWithSkuOnFirstVariant);

      expect(result).toBe(true);
      expect(item.sku).toBe('SNK-42-NOIR');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('Produits parfum / accessory (sans size)', () => {
    it('ne crashe pas et n\'invente pas de size', () => {
      const parfumProduct = {
        _id: newObjectId(),
        name: 'Eau de Parfum Luxe',
        sku: 'PARF-001',
        images: [{ url: 'https://cdn.example.com/parfum.jpg', isPrimary: true }],
        variants: [],
      };
      const item = { name: 'Produit', sku: 'N/A', price: 15000, quantity: 1 };
      enrichSingleItem(item, parfumProduct);

      expect(item.name).toBe('Eau de Parfum Luxe');
      expect(item.sku).toBe('PARF-001');
      expect(item.size).toBeUndefined();
      expect(item.color).toBeUndefined();
      expect(item.image).toBe('https://cdn.example.com/parfum.jpg');
    });
  });
});
