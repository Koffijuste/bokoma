// scripts/use-mobile-env.cjs
// ============================================================================
// 📱 Copie .env.mobile → .env.local avant un build mobile.
// Cross-platform (Node, pas de PowerShell-only).
// ============================================================================

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, '.env.mobile');
const target = path.join(root, '.env.local');

if (!fs.existsSync(source)) {
  console.error(`❌ Fichier source introuvable : ${source}`);
  process.exit(1);
}

try {
  // Lit le .env.local existant pour préserver les éventuelles vars locales
  // (VAPID keys, etc.) que l'utilisateur aurait ajoutées manuellement.
  let merged = fs.readFileSync(source, 'utf8');

  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target, 'utf8');
    // Si l'existant contient des vars que le mobile n'a pas, on les garde
    // en bas du fichier (priorité au .env.local existant, sauf pour les
    // vars NEXT_PUBLIC_* spécifiques au mobile).
    const mobileKeys = new Set(
      merged
        .split('\n')
        .map((l) => l.match(/^([A-Z0-9_]+)\s*=/))
        .filter(Boolean)
        .map((m) => m[1])
    );
    const preserved = existing
      .split('\n')
      .filter((line) => {
        const m = line.match(/^([A-Z0-9_]+)\s*=/);
        return !m || !mobileKeys.has(m[1]);
      })
      .join('\n');
    if (preserved.trim()) {
      merged += '\n# --- Préservé de l\'ancien .env.local ---\n' + preserved;
    }
  }

  fs.writeFileSync(target, merged, 'utf8');
  console.log(`✅ ${path.relative(root, source)} → ${path.relative(root, target)}`);
  console.log('   Build mobile prêt. NEXT_PUBLIC_BUILD_TARGET=mobile');
} catch (err) {
  console.error('❌ Erreur copie .env:', err.message);
  process.exit(1);
}
