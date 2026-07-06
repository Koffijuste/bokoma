// tests/helpers/factories.js
// ============================================================================
// 🏭 FACTORIES — Génèrent des données de test valides
// ============================================================================

const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Category = require('../../src/models/Category');
const Cart = require('../../src/models/Cart');
const Order = require('../../src/models/Order');
const Coupon = require('../../src/models/Coupon');

const createUser = async (overrides = {}) => {
  const password = overrides.password || 'Test1234';
  const userData = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    password,
    role: 'customer',
    isActive: true,
    isVerified: true,
    ...overrides,
  };

  // Hash du mot de passe (déclenche le hook pre-save)
  const user = new User(userData);
  await user.save();
  user.plainPassword = password; // Conservé pour les tests login
  return user;
};

const createAdminUser = async (overrides = {}) => {
  return createUser({ role: 'admin', ...overrides });
};

const createCategory = async (overrides = {}) => {
  return Category.create({
    name: faker.commerce.department(),
    slug: faker.lorem.slug(),
    isActive: true,
    ...overrides,
  });
};

const createProduct = async (category, overrides = {}) => {
  const basePrice = overrides.basePrice ?? faker.number.int({ min: 1000, max: 50000 });
  const product = await Product.create({
    name: faker.commerce.productName(),
    slug: faker.lorem.slug() + '-' + faker.string.alphanumeric(6),
    description: faker.commerce.productDescription(),
    shortDesc: faker.commerce.productAdjective(),
    category: category._id,
    brand: faker.company.name(),
    type: faker.helpers.arrayElement(['shoes', 'perfume', 'clothing', 'accessory']),
    basePrice,
    comparePrice: basePrice * 1.2,
    currency: 'XOF',
    totalStock: overrides.totalStock ?? 50,
    images: [
      { url: faker.image.url(), publicId: faker.string.alphanumeric(10), isPrimary: true },
    ],
    isActive: true,
    isFeatured: false,
    ...overrides,
  });
  return product;
};

const createProductWithVariants = async (category, variants = [], overrides = {}) => {
  return createProduct(category, {
    variants: variants.map((v) => ({
      sku: v.sku || faker.string.alphanumeric(10).toUpperCase(),
      size: v.size || 'M',
      color: v.color || 'Noir',
      stock: v.stock ?? 10,
      price: v.price ?? null,
      isActive: true,
    })),
    ...overrides,
  });
};

const createCart = async (userId, items = []) => {
  return Cart.create({
    user: userId,
    items,
  });
};

const createOrder = async (user, overrides = {}) => {
  const orderItems = overrides.items || [
    {
      product: faker.database.mongodbObjectId(),
      name: faker.commerce.productName(),
      sku: faker.string.alphanumeric(8),
      price: 5000,
      quantity: 1,
      subtotal: 5000,
    },
  ];

  return Order.create({
    user: user._id,
    items: orderItems,
    shipping: {
      fullName: `${user.firstName} ${user.lastName}`,
      phone: '+2250707070707',
      street: faker.location.streetAddress(),
      city: 'Abidjan',
      country: 'Côte d\'Ivoire',
      method: 'standard',
      cost: 2500,
      ...overrides.shipping,
    },
    payment: {
      method: 'mobile_money',
      status: 'pending',
      transactionId: `CMD-TEST-${Date.now()}`,
      provider: 'cinetpay',
      amountPaid: 0,
      remainingAmount: 0,
      ...overrides.payment,
    },
    subtotal: overrides.subtotal ?? 5000,
    shippingCost: overrides.shippingCost ?? 2500,
    discount: 0,
    total: overrides.total ?? 7500,
    currency: 'XOF',
    status: overrides.status ?? 'pending',
    ...overrides,
  });
};

const createCoupon = async (overrides = {}) => {
  const code = (overrides.code || faker.string.alphanumeric(8)).toUpperCase();
  return Coupon.create({
    code,
    type: overrides.type || 'percentage',
    value: overrides.value || 10,
    minOrderAmount: overrides.minOrderAmount || 0,
    maxDiscount: overrides.maxDiscount || null,
    usageLimit: overrides.usageLimit || null,
    usagePerUser: 1,
    usedCount: 0,
    usedBy: [],
    isActive: true,
    startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  });
};

module.exports = {
  createUser,
  createAdminUser,
  createCategory,
  createProduct,
  createProductWithVariants,
  createCart,
  createOrder,
  createCoupon,
};