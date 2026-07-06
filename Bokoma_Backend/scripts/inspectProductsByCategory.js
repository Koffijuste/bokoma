require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
    console.log('Connected to DB');

    const products = await Product.find({ isActive: true })
      .populate('category', 'name slug')
      .lean();

    console.log(`\n=== Total active products: ${products.length} ===\n`);

    const byCatSlug = {};
    products.forEach((p) => {
      const slug = p.category?.slug || '(no-category)';
      if (!byCatSlug[slug]) byCatSlug[slug] = [];
      byCatSlug[slug].push({
        name: p.name,
        slug: p.slug,
        type: p.type,
        catName: p.category?.name,
        catSlug: p.category?.slug,
      });
    });

    Object.keys(byCatSlug).forEach((slug) => {
      console.log(`\n--- ${slug} (${byCatSlug[slug].length} produit(s)) ---`);
      byCatSlug[slug].forEach((p) => {
        console.log(`  • ${p.name} | type=${p.type} | catName="${p.catName}"`);
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();