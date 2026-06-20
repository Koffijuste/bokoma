// scripts/fix-product-indexes.js
const mongoose = require('mongoose');

// ✅ Charger dotenv correctement
try {
  require('dotenv').config();
} catch (e) {
  console.log('⚠️ dotenv non disponible, utilisation des variables d\'env système');
}

// ✅ Essayer plusieurs noms de variables possibles
const MONGO_URI = 
  process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  process.env.DB_URL;

console.log('🔍 Variables d\'environnement détectées:');
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅' : '❌');
console.log('  MONGO_URI:', process.env.MONGO_URI ? '✅' : '❌');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅' : '❌');
console.log('  MONGO_URL:', process.env.MONGO_URL ? '✅' : '❌');
console.log('  DB_URL:', process.env.DB_URL ? '✅' : '❌');
console.log('');

if (!MONGO_URI) {
  console.error('❌ Aucune variable MongoDB trouvée!');
  console.error('');
  console.error('📋 Veuillez vérifier votre fichier .env et ajouter une de ces variables:');
  console.error('  MONGODB_URI=mongodb://localhost:27017/bokoma');
  console.error('');
  console.error('📋 Variables disponibles dans process.env:');
  console.log(Object.keys(process.env).filter(k => 
    k.toLowerCase().includes('mongo') || 
    k.toLowerCase().includes('database') ||
    k.toLowerCase().includes('db')
  ));
  process.exit(1);
}

console.log('✅ URI MongoDB trouvée:', MONGO_URI.replace(/\/\/.*@/, '//***@'));
console.log('');

async function fixIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected');
    
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    
    // 1. Lister tous les indexes
    console.log('\n📋 Indexes actuels sur la collection products:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });
    
    // 2. Supprimer TOUS les indexes sur variants.sku
    const skuIndexes = indexes.filter(idx => 
      idx.name.includes('sku') || 
      (idx.key && JSON.stringify(idx.key).includes('variants.sku'))
    );
    
    if (skuIndexes.length > 0) {
      console.log(`\n🗑️ Suppression de ${skuIndexes.length} index(es) sur variants.sku...`);
      for (const idx of skuIndexes) {
        try {
          await collection.dropIndex(idx.name);
          console.log(`  ✅ Supprimé: ${idx.name}`);
        } catch (err) {
          console.log(`  ⚠️ Impossible de supprimer ${idx.name}:`, err.message);
        }
      }
    } else {
      console.log('\nℹ️ Aucun index sur variants.sku trouvé');
    }
    
    // 3. Nettoyer les variants avec sku null ou vide
    console.log('\n🧹 Nettoyage des variants avec sku vide...');
    const cleanResult = await collection.updateMany(
      { 'variants.sku': { $in: [null, ''] } },
      { $unset: { 'variants.$.sku': '' } }
    );
    console.log(`  ✅ ${cleanResult.modifiedCount} document(s) nettoyé(s)`);
    
    // 4. Statistiques
    console.log('\n📊 Statistiques:');
    const totalProducts = await collection.countDocuments();
    const productsWithVariants = await collection.countDocuments({ 'variants.0': { $exists: true } });
    const productsWithTotalStock = await collection.countDocuments({ totalStock: { $gt: 0 } });
    
    console.log(`  Total produits: ${totalProducts}`);
    console.log(`  Produits avec variantes: ${productsWithVariants}`);
    console.log(`  Produits avec stock > 0: ${productsWithTotalStock}`);
    
    // 5. Afficher quelques produits pour vérifier
    console.log('\n📦 Échantillon de 3 produits:');
    const sample = await collection.find({}).limit(3).project({ name: 1, totalStock: 1, variants: 1 }).toArray();
    sample.forEach(p => {
      console.log(`  - ${p.name}: totalStock=${p.totalStock}, variants=${p.variants?.length || 0}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Terminé avec succès!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

fixIndexes();