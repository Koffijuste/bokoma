// scripts/normalize-categories.js
// ============================================================================
// 🔧 NORMALISE LES CATÉGORIES — Aligne les slugs sur le frontend
// ============================================================================
// - Renomme le slug `vetement` → `vetements` (pour matcher le frontend)
// - Renomme `parfum` → `parfums`
// - Active les catégories "Chaussures" et "Vêtements" qui étaient désactivées
// - Supprime les doublons inactifs (chaussures-mpi7lpbo, sneakers, sandales
//   inactives, etc.) pour ne garder que les actives
// ============================================================================
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');

const slugify = (s) =>
  s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
    console.log('✅ Connected to DB');

    const cats = await Category.find().lean();
    console.log(`📦 ${cats.length} catégories trouvées\n`);

    // ────────────────────────────────────────────────────────
    // 1. Mapping : nom canonique → { slug canonique, emojis }
    // ────────────────────────────────────────────────────────
    const canonical = {
      'Chaussures':  { slug: 'chaussures',  emoji: '👟', color: 'from-blue-500/10 to-blue-500/5' },
      'Vêtements':   { slug: 'vetements',   emoji: '👕', color: 'from-purple-500/10 to-purple-500/5' },
      'Accessoires': { slug: 'accessoires', emoji: '👜', color: 'from-pink-500/10 to-pink-500/5' },
      'Parfum':      { slug: 'parfums',     emoji: '✨', color: 'from-amber-500/10 to-amber-500/5' },
      'sandales':    { slug: 'sandales',    emoji: '🩴', color: 'from-orange-500/10 to-orange-500/5' },
      'Sneakers':    { slug: 'sneakers',    emoji: '👟', color: 'from-cyan-500/10 to-cyan-500/5' },
    };

    // ────────────────────────────────────────────────────────
    // 2. Pour chaque catégorie : on harmonise slug + isActive
    // ────────────────────────────────────────────────────────
    const updates = [];
    for (const cat of cats) {
      const canon = canonical[cat.name];
      if (!canon) {
        console.log(`⏭️  Ignoré (nom inconnu) : ${cat.name} [${cat.slug}]`);
        continue;
      }

      const needsSlugUpdate = cat.slug !== canon.slug;
      const needsActiveUpdate = !cat.isActive;

      if (needsSlugUpdate || needsActiveUpdate) {
        // Vérifier qu'aucune autre catégorie n'occupe déjà ce slug
        const conflict = await Category.findOne({
          slug: canon.slug,
          _id: { $ne: cat._id },
        }).lean();

        if (conflict) {
          console.log(
            `⚠️  Conflit : ${cat.name} [${cat.slug}] → ${canon.slug} mais déjà pris par ${conflict.name} [${conflict.slug}]`,
          );

          // Stratégie : fusionner — ré-assigner les produits de `cat` vers `conflict`
          // puis supprimer `cat`
          const productsToMove = await Product.find({ category: cat._id }).select('_id').lean();
          if (productsToMove.length > 0) {
            await Product.updateMany(
              { category: cat._id },
              { $set: { category: conflict._id } },
            );
            console.log(`   ↳ ${productsToMove.length} produit(s) déplacé(s) vers ${conflict.name}`);
          }
          await Category.deleteOne({ _id: cat._id });
          console.log(`   ↳ ${cat.name} [${cat.slug}] supprimé (doublon)`);
          continue;
        }

        const set = {};
        if (needsSlugUpdate) set.slug = canon.slug;
        if (needsActiveUpdate) set.isActive = true;

        await Category.updateOne({ _id: cat._id }, { $set: set });
        updates.push({ name: cat.name, oldSlug: cat.slug, newSlug: canon.slug, wasActive: cat.isActive });
        console.log(
          `✏️  ${cat.name} : slug "${cat.slug}" → "${canon.slug}"${needsActiveUpdate ? ' (activée)' : ''}`,
        );
      } else {
        console.log(`✓ ${cat.name} [${cat.slug}] OK`);
      }
    }

    // ────────────────────────────────────────────────────────
    // 3. Vérif finale
    // ────────────────────────────────────────────────────────
    console.log('\n📊 État final :');
    const final = await Category.find().sort({ order: 1, name: 1 }).lean();
    final.forEach((c, i) => {
      const flag = c.isActive ? '✅' : '❌';
      console.log(`  ${i + 1}. ${flag} ${c.name} [${c.slug}]`);
    });

    console.log('\n🎉 Terminé.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();