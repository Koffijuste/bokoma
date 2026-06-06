require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/models/Category');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
    console.log('Connected to DB');
    const cats = await Category.find().lean();
    console.log('Total categories:', cats.length);
    cats.forEach((c, i) => {
      console.log(i + 1, { _id: c._id, name: c.name, slug: c.slug, parent: c.parent, isActive: c.isActive });
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
