// scripts/promote-admin.js
// ============================================================================
// 🔧 PROMOTION RAPIDE — Passer un user en role=admin (ou autre)
// ============================================================================
// Usage:
//   node scripts/promote-admin.js <email> [role]
//
// Exemples:
//   node scripts/promote-admin.js admin@bokoma.ci
//   node scripts/promote-admin.js admin@bokoma.ci manager
//   node scripts/promote-admin.js client@bokoma.ci customer
//
// Le role par défaut est "admin" si non spécifié.
// Valeurs valides (cf. User.js schema): customer, admin, manager.
// ============================================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const ALLOWED_ROLES = ['customer', 'admin', 'manager'];

async function main() {
  const [,, emailArg, roleArg = 'admin'] = process.argv;

  if (!emailArg) {
    console.error('\n❌ Usage: node scripts/promote-admin.js <email> [role]\n');
    console.error('   Rôles valides :', ALLOWED_ROLES.join(', '));
    process.exit(1);
  }
  if (!ALLOWED_ROLES.includes(roleArg)) {
    console.error(`\n❌ Rôle invalide "${roleArg}". Rôles valides :`, ALLOWED_ROLES.join(', '));
    process.exit(1);
  }

  const email = emailArg.toLowerCase().trim();
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('\n❌ MONGO_URI manquant dans .env');
    process.exit(1);
  }

  console.log(`\n🔌 Connexion MongoDB...`);
  await mongoose.connect(uri);
  console.log('✅ Connecté.\n');

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`❌ Aucun user trouvé avec l'email "${email}"`);
    process.exit(2);
  }

  const before = user.role;
  if (before === roleArg) {
    console.log(`ℹ️  ${email} a déjà le rôle "${roleArg}". Rien à faire.`);
  } else {
    user.role = roleArg;
    await user.save({ validateBeforeSave: false });
    console.log(`✅ ${email} : "${before}" → "${roleArg}"`);
  }

  // Vérif + affichage infos utiles
  const fresh = await User.findOne({ email }).select('email role firstName lastName isActive');
  console.log('\n📋 État actuel :');
  console.table([fresh.toObject()]);

  await mongoose.disconnect();
  console.log('\n👋 Déconnecté. Tu peux maintenant te logger avec ce compte.\n');
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale :', err.message);
  console.error(err.stack);
  process.exit(99);
});
