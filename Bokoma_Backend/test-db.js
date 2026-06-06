// test-db.js
require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB connection...');
console.log('   URI (masked):', process.env.MONGO_URI?.replace(/:[^@]+@/, ':***@'));

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
  })
  .then(() => {
    console.log('✅ MongoDB connected!');
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('\n💡 ECONNREFUSED — Causes probables:');
      console.error('   1. IP non whitelistée dans Atlas → Network Access');
      console.error('   2. Cluster paused/inactif dans Atlas');
      console.error('   3. DNS SRV bloqué');
      console.error('   4. Firewall/proxy local');
    }
    process.exit(1);
  });