// scripts/seed-products.js
const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../src/models/Product');

const sampleProducts = [
  {
    name: 'Sneakers Premium',
    slug: 'sneakers-premium',
    description: 'Chaussures de sport haut de gamme',
    basePrice: 89000,
    category: '65abc123...', // ID d'une catégorie existante
    type: 'shoes',
    brand: 'Bokoma',
    totalStock: 50,
    isActive: true,
    images: ['/images/products/sneaker-1.jpg'],
  },
  // ... plus de produits
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await Product.insertMany(sampleProducts);
  console.log('✅ Produits seedés');
  await mongoose.disconnect();
}

seed().catch(console.error);