const Product  = require('../models/Product');
const AppError = require('../utils/AppError');

const normalizeQuantity = (quantity) => {
  const value = Number(quantity);
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError('Quantité invalide', 400);
  }
  return value;
};

const getVariantLabel = (variant) => [variant?.size, variant?.color]
  .filter(Boolean)
  .join(' / ');

const explainDecrementFailure = async (item, quantity) => {
  const product = await Product.findById(item.product).lean();
  if (!product) throw new AppError(`Produit introuvable : ${item.product}`, 404);

  if (item.variant) {
    const variant = product.variants?.find((v) => v._id.toString() === item.variant.toString());
    if (!variant) throw new AppError(`Variante introuvable pour ${product.name}`, 404);

    throw new AppError(
      `Stock insuffisant pour "${product.name}" (${getVariantLabel(variant)}) : ${variant.stock} disponible(s)`,
      409,
    );
  }

  throw new AppError(
    `Stock insuffisant pour "${product.name}" : ${product.totalStock} disponible(s)`,
    409,
  );
};

/**
 * Vérifie et décrémente le stock pour un tableau d'items de commande.
 * Les décréments passent par des updates Mongo atomiques (`stock >= quantity`)
 * pour empêcher l'overselling lors de checkouts concurrents.
 *
 * @param {Array} items  [{ product, variant, quantity }]
 */
const decrementStock = async (items) => {
  const decrementedItems = [];

  try {
    for (const item of items) {
      const quantity = normalizeQuantity(item.quantity);
      const update = { $inc: { soldCount: quantity } };
      let result;

      if (item.variant) {
        update.$inc['variants.$.stock'] = -quantity;
        update.$inc.totalStock = -quantity;

        result = await Product.updateOne(
          {
            _id: item.product,
            variants: {
              $elemMatch: {
                _id: item.variant,
                stock: { $gte: quantity },
              },
            },
          },
          update,
        );
      } else {
        update.$inc.totalStock = -quantity;

        result = await Product.updateOne(
          {
            _id: item.product,
            totalStock: { $gte: quantity },
          },
          update,
        );
      }

      if (result.modifiedCount !== 1) {
        await explainDecrementFailure(item, quantity);
      }

      decrementedItems.push({
        product: item.product,
        variant: item.variant,
        quantity,
      });
    }
  } catch (err) {
    if (decrementedItems.length > 0) {
      await restoreStock(decrementedItems);
    }
    throw err;
  }
};

/**
 * Réintègre le stock lors d'une annulation de commande.
 * @param {Array} items  [{ product, variant, quantity }]
 */
const restoreStock = async (items) => {
  for (const item of items) {
    const quantity = normalizeQuantity(item.quantity);
    const product = await Product.findById(item.product);
    if (!product) continue;

    if (item.variant) {
      const variant = product.variants.id(item.variant);
      if (variant) variant.stock += quantity;
    } else {
      product.totalStock += quantity;
    }

    product.soldCount = Math.max(0, (product.soldCount || 0) - quantity);
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
