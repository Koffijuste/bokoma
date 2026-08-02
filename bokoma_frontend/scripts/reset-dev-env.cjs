// scripts/reset-dev-env.cjs
// ============================================================================
// 🔄 RESET ENV DEV — remet .env.local en mode "web dev" (localhost:5000)
// ============================================================================
// Quand tu lances `npm run build:mobile`, le script use-mobile-env.cjs
// écrase .env.local avec la config MOBILE (NEXT_PUBLIC_BUILD_TARGET=mobile,
// baseURL=Railway). C'est pratique pour builder l'app native, mais ça casse
// le `npm run dev` qui suit (le front pense qu'il est en mobile et fait
// des requêtes cross-origin vers Railway depuis localhost:3000 → bloqué CORS).
//
// Ce script remet .env.local en mode "web dev" en se basant sur .env
// (qui contient la config localhost). On GARDE le .env original (jamais
// touché) et on RÉÉCRIT .env.local par-dessus.
// ============================================================================

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceEnv = path.join(root, '.env');
const targetLocal = path.join(root, '.env.local');

if (!fs.existsSync(sourceEnv)) {
  console.error('❌ Fichier .env introuvable. Abandon.');
  process.exit(1);
}

// 1. Lit .env (config dev originale, qui pointe sur localhost:5000)
const devConfig = fs.readFileSync(sourceEnv, 'utf8');

// 2. Ajoute une ligne de garde-fou pour que `npm run dev` ne croit PAS
//    être en mode mobile.
const guarded = `# ⚠️ Reset pour le dev web le ${new Date().toISOString()}\n` +
                `# Ce fichier a été regénéré par scripts/reset-dev-env.cjs.\n` +
                `# Si tu veux rebuild l'app mobile, lance plutôt : npm run build:mobile\n` +
                `# (le script use-mobile-env.cjs re-écrasera ce fichier proprement).\n\n` +
                devConfig;

// 3. Écrase .env.local (pas de suppression → pas de permission refusée)
fs.writeFileSync(targetLocal, guarded, 'utf8');
console.log('✅ .env.local remis en mode "web dev"');
console.log('   → NEXT_PUBLIC_API_URL pointe sur localhost:5000');
console.log('   → Pas de NEXT_PUBLIC_BUILD_TARGET=mobile (donc isMobileBuild=false)');
console.log('');
console.log('Tu peux maintenant relancer :');
console.log('   npm run dev');
console.log('');
console.log('Pour rebuild l\'app mobile plus tard, lance :');
console.log('   npm run build:mobile   # use-mobile-env.cjs re-écrasera .env.local');
console.log('   npm run reset-dev-env  # ce script, pour revenir au dev web');
