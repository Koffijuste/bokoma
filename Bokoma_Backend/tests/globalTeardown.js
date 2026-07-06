// tests/globalTeardown.js
// ============================================================================
// 🧪 GLOBAL TEARDOWN — Coupe MongoMemory après tous les tests
// ============================================================================

module.exports = async () => {
  if (global.__MONGO_SERVER__) {
    await global.__MONGO_SERVER__.stop();
    console.log('✅ [Test] MongoMemory arrêté');
  }
};