// scripts/split-dynamic-pages.cjs
// ============================================================================
// 🔧 REFACTOR ASSISTANT — Sépare page.tsx en (server wrapper + client comp)
// ============================================================================
// Next.js 15 interdit d'exporter `generateStaticParams` depuis un fichier
// `'use client'`. Pour les routes dynamiques dont la logique est full
// client, on doit :
//   1. Renommer l'ancien page.tsx → <Name>Client.tsx
//   2. Créer un nouveau page.tsx server qui :
//      - Exporte `dynamic = 'force-static'`
//      - Exporte `generateStaticParams() { return [{}]; }`
//      - Rend `<Name>Client />
//
// Ce script fait l'étape 1 automatiquement (le renommage) pour les 4
// routes dynamiques. L'étape 2 (le nouveau page.tsx) est ensuite faite
// manuellement via l'outil edit car c'est un fichier simple.
// ============================================================================

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const renames = [
  {
    from: 'app/(public)/verify/[orderId]/page.tsx',
    to: 'app/(public)/verify/[orderId]/VerifyClient.tsx',
  },
  {
    from: 'app/(public)/products/[slug]/page.tsx',
    to: 'app/(public)/products/[slug]/ProductClient.tsx',
  },
  {
    from: 'app/(public)/orders/[orderId]/confirmation/page.tsx',
    to: 'app/(public)/orders/[orderId]/confirmation/ConfirmationClient.tsx',
  },
  {
    from: 'app/(client)/orders/[orderId]/page.tsx',
    to: 'app/(client)/orders/[orderId]/OrderClient.tsx',
  },
];

for (const { from, to } of renames) {
  const fromPath = path.join(root, from);
  const toPath = path.join(root, to);

  if (!fs.existsSync(fromPath)) {
    console.log(`⚠️  Introuvable: ${from}`);
    continue;
  }
  if (fs.existsSync(toPath)) {
    console.log(`⏭️  Existe déjà: ${to} — skip`);
    continue;
  }

  let content = fs.readFileSync(fromPath, 'utf8');

  // 1. Renomme le `export default function XxxPage` en `export default function XxxClient`
  //    pour éviter les conflits quand le nouveau page.tsx importe ce fichier.
  content = content.replace(
    /export default function (\w+)Page\b/g,
    'export default function $1Client'
  );

  // 2. Renomme également le nom interne du composant dans le JSX
  //    (si on a <XxxPage> qqpart). On matche les 4 noms connus.
  const knownNames = {
    'OrderVerificationPage': 'OrderVerificationClient',
    'ProductPage': 'ProductClient',
    'OrderConfirmationPage': 'OrderConfirmationClient',
    'OrderPage': 'OrderClient',
  };
  for (const [oldName, newName] of Object.entries(knownNames)) {
    content = content.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
  }

  fs.writeFileSync(toPath, content, 'utf8');
  console.log(`✅ ${from}  →  ${to}`);
}

console.log('\nMaintenant, crée les nouveaux page.tsx server qui rendent ces Client components.');
