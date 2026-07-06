// tests/globalSetup.js
// ============================================================================
// 🧪 GLOBAL SETUP — Démarre MongoMemory avant tous les tests
// ============================================================================

const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');

// Charge .env.test AVANT tout le reste
require('dotenv').config({
  path: path.join(__dirname, '..', '.env.test'),
});

module.exports = async () => {
  // Démarre une instance MongoDB en mémoire (plus rapide qu'un mock de mongoose)
  const mongoServer = await MongoMemoryServer.create({
    binary: {
      // Permet de réutiliser un binaire déjà téléchargé
      version: '7.0.14',
    },
    instance: {
      dbName: 'bokoma_test',
    },
  });

  // Expose l'URI à globalTeardown + tests
  global.__MONGO_URI__ = mongoServer.getUri();
  global.__MONGO_SERVER__ = mongoServer;

  // Configure l'env pour que l'app Express pointe dessus
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = global.__MONGO_URI__;
  process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_replace_in_prod';
  process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_replace_in_prod';
  process.env.JWT_ISSUER = 'bokoma-api-test';
  process.env.JWT_AUDIENCE = 'bokoma-users-test';
  process.env.JWT_ACCESS_EXPIRES_IN = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.CINETPAY_API_KEY = 'test_api_key';
  process.env.CINETPAY_API_PASSWORD_CI = 'test_webhook_secret';
  process.env.CLIENT_URL = 'http://localhost:3000';
  process.env.API_URL = 'http://localhost:5000';
  process.env.PORT = '0';

  console.log(`✅ [Test] MongoMemory démarré : ${global.__MONGO_URI__}`);
};