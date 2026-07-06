// app/(public)/auth/loading.tsx
// ============================================================================
// ⏳ LOADER AUTH — Loader circulaire brandé Bokoma pour login/register/etc.
// ============================================================================

import { BokomaLoader } from '@/components/ui/bokoma-loader';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <BokomaLoader
        size={110}
        message="Connexion en cours..."
        showWordmark
        showDots
      />
    </div>
  );
}