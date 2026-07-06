// components/features/RatingPromptHost.tsx
'use client';

import { useRatingPromptStore } from '@/store/ratingPrompt';
import { useRatingPrompt } from '@/hooks/useRatingPrompt';
import RateProductDialog from './RateProductDialog';

export default function RatingPromptHost() {
  const { open, product, close } = useRatingPromptStore();
  const { markRated, markSkipped, markNever } = useRatingPrompt();

  return (
    <RateProductDialog
      open={open}
      product={product}
      onClose={close}
      onRated={markRated}
      onSkipped={markSkipped}
      onNeverAskAgain={markNever}
    />
  );
}
