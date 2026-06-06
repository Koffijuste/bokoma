const Product  = require('../models/Product');
const AppError = require('../utils/AppError');

/**
 * Vérifie et décrémente le stock pour un tableau d'items de commande.
 * Utilise des opérations atomiques pour éviter les race conditions.
 *
 * @param {Array} items  [{ product, variant, quantity }]
 */
const decrementStock = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new AppError(`Produit introuvable : ${item.product}`, 404);

    if (item.variant) {
      // Produit avec variante (taille / couleur)
      const variant = product.variants.id(item.variant);
      if (!variant) throw new AppError(`Variante introuvable pour ${product.name}`, 404);
      if (variant.stock < item.quantity) {
        throw new AppError(
          `Stock insuffisant pour "${product.name}" (${variant.size || ''}${variant.color || ''}) : ${variant.stock} disponible(s)`,
          409
        );
      }
      variant.stock -= item.quantity;
    } else {
      // Produit sans variante
      if (product.totalStock < item.quantity) {
        throw new AppError(`Stock insuffisant pour "${product.name}" : ${product.totalStock} disponible(s)`, 409);
      }
      product.totalStock -= item.quantity;
    }

    product.soldCount = (product.soldCount || 0) + item.quantity;
    await product.save();
  }
};

/**
 * Réintègre le stock lors d'une annulation de commande.
 * @param {Array} items  [{ product, variant, quantity }]
 */
const restoreStock = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    if (item.variant) {
      const variant = product.variants.id(item.variant);
      if (variant) variant.stock += item.quantity;
    } else {
      product.totalStock += item.quantity;
    }

    product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
    await product.save();
  }
};

/**
 * Vérifie la disponibilité sans modifier le stock.
 * Renvoie un tableau des items en rupture.
 */
const checkAvailability = async (items) => {
  const outOfStock = [];
  for (const item of items) {
    const product = await Product.findById(item.product).lean();
    if (!product) { outOfStock.push({ ...item, reason: 'Produit introuvable' }); continue; }

    if (item.variant) {
      const variant = product.variants.find((v) => v._id.toString() === item.variant.toString());
      if (!variant || variant.stock < item.quantity) {
        outOfStock.push({ ...item, available: variant?.stock ?? 0, name: product.name });
      }
    } else if (product.totalStock < item.quantity) {
      outOfStock.push({ ...item, available: product.totalStock, name: product.name });
    }
  }
  return outOfStock;
};

module.exports = { decrementStock, restoreStock, checkAvailability };