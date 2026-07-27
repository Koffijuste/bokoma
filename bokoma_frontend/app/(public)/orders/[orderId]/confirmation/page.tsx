// app/(public)/orders/[orderId]/confirmation/page.tsx
// ============================================================================
// 📦 SERVER WRAPPER pour /orders/[orderId]/confirmation
// ============================================================================
// Server Component minimaliste. La logique UI est dans ./ConfirmationClient.tsx.
// ============================================================================

import ConfirmationClient from './ConfirmationClient';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ orderId: '_' }];
}

export default function OrderConfirmationPage() {
  return <ConfirmationClient />;
}
