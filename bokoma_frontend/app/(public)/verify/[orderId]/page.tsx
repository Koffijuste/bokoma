// app/(public)/verify/[orderId]/page.tsx
// ============================================================================
// 📦 SERVER WRAPPER pour /verify/[orderId]
// ============================================================================
// Server Component minimaliste. La logique UI est dans ./VerifyClient.tsx.
// ============================================================================

import VerifyClient from './VerifyClient';

export const dynamic = 'force-static';

// ✅ Génère un placeholder de route statique. Le composant client lit
//    ensuite l'orderId réel depuis window.location.pathname via useParams().
export function generateStaticParams() {
  return [{ orderId: '_' }];
}

export default function VerifyPage() {
  return <VerifyClient />;
}
