// app/(public)/products/[slug]/page.tsx
// ============================================================================
// 📦 SERVER WRAPPER pour /products/[slug]
// ============================================================================
// Server Component minimaliste. La logique UI est dans ./ProductClient.tsx.
// ============================================================================

import ProductClient from './ProductClient';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ slug: '_' }];
}

export default function ProductPage() {
  return <ProductClient />;
}
