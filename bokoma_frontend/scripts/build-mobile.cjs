// scripts/build-mobile.cjs
// ============================================================================
// 📱 LANCE LE BUILD MOBILE avec CAPACITOR_BUILD=1
// ============================================================================
// On set la variable d'env process.env.CAPACITOR_BUILD avant d'invoquer
// `next build`, pour que next.config.js active la branche `output: 'export'`
// (sinon on build comme le web et le dossier `out/` n'est jamais créé).
//
// Cross-platform : pas de shell `set` / `export` — on fork un process Node
// enfant avec l'env var dans son env.
// ============================================================================

const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Trouve le binaire next. Sur Windows, c'est next.cmd ; ailleurs, c'est next.
const isWin = process.platform === 'win32';
const nextBin = path.join(
  root,
  'node_modules',
  '.bin',
  isWin ? 'next.cmd' : 'next'
);

console.log('📱 Build mobile — CAPACITOR_BUILD=1');
console.log('   next bin:', nextBin);

const child = spawn(nextBin, ['build'], {
  cwd: root,
  stdio: 'inherit',
  shell: isWin, // .cmd a besoin d'un shell sur Windows
  env: {
    ...process.env,
    CAPACITOR_BUILD: '1',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`❌ Build interrompu par signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
