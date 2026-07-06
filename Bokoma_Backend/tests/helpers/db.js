// tests/helpers/db.js
// ============================================================================
// 🗄️ HELPERS DB — Connexion / nettoyage entre les tests
// ============================================================================

const mongoose = require('mongoose');

/**
 * Connecte mongoose à la MongoMemory démarrée par globalSetup.
 * Utilise un cache pour éviter les reconnexions entre tests.
 */
let cachedConn = null;

const connectTestDB = async () => {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  await mongoose.connect(global.__MONGO_URI__, {
    dbName: 'bokoma_test',
    serverSelectionTimeoutMS: 10000,
  });

  cachedConn = mongoose.connection;
  return cachedConn;
};

const disconnectTestDB = async () => {
  await mongoose.disconnect();
  cachedConn = null;
};

/**
 * Vide toutes les collections entre chaque test.
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    const collection = collections[key];
    try {
      await collection.deleteMany({});
    } catch (err) {
      // Ignorer les erreurs sur les collections vides
    }
  }
};

/**
 * Génère un token JWT valide pour un utilisateur (helper d'auth dans les tests).
 */
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');

const generateAuthToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    jwtConfig.access.secret,
    {
      expiresIn: jwtConfig.access.expiresIn,
      issuer: jwtConfig.access.issuer,
      audience: jwtConfig.access.audience,
    },
  );
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  generateAuthToken,
};