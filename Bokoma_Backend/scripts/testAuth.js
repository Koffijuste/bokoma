// scripts/testAuth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('🧪 Test JWT Configuration\n');

// ✅ Utiliser les bons noms de variables
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const ISSUER = process.env.JWT_ISSUER;
const AUDIENCE = process.env.JWT_AUDIENCE;

// Vérifier les secrets
console.log('🔑 JWT_ACCESS_SECRET:', ACCESS_SECRET ? '✅ Présent' : '❌ Manquant');
console.log('🔑 JWT_REFRESH_SECRET:', REFRESH_SECRET ? '✅ Présent' : '❌ Manquant');
console.log('🔑 JWT_ACCESS_EXPIRES_IN:', ACCESS_EXPIRES);
console.log('🔑 JWT_REFRESH_EXPIRES_IN:', REFRESH_EXPIRES);
console.log('🔑 JWT_ISSUER:', ISSUER || '❌ Non défini');
console.log('🔑 JWT_AUDIENCE:', AUDIENCE || '❌ Non défini');

// Tester la génération de tokens
try {
  const testPayload = { userId: 'test123' };
  
  const accessToken = jwt.sign(testPayload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  console.log('\n✅ Access token généré:', accessToken.substring(0, 30) + '...');
  
  const refreshToken = jwt.sign(testPayload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  console.log('✅ Refresh token généré:', refreshToken.substring(0, 30) + '...');
  
  // Vérifier la décodabilité
  const decodedAccess = jwt.verify(accessToken, ACCESS_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  console.log('✅ Access token décodé:', decodedAccess);
  
  const decodedRefresh = jwt.verify(refreshToken, REFRESH_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  console.log('✅ Refresh token décodé:', decodedRefresh);
  
  console.log('\n✅ Configuration JWT correcte !');
  
} catch (err) {
  console.error('❌ Erreur JWT:', err.message);
  if (err.name === 'TokenExpiredError') {
    console.error('   → Token expiré');
  } else if (err.name === 'JsonWebTokenError') {
    console.error('   → Token invalide');
  }
}