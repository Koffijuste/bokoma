// app/(client)/orders/[orderId]/page.tsx
// ============================================================================
// 📦 SERVER WRAPPER pour /orders/[orderId]
// ============================================================================
// Server Component minimaliste. La logique UI est dans ./OrderClient.tsx.
// ============================================================================

import OrderClient from './OrderClient';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ orderId: '_' }];
}

export default function OrderPage() {
  return <OrderClient />;
}
