// store/ratingPrompt.ts
import { create } from 'zustand';

export interface RatePromptProduct {
  _id: string;
  name: string;
  image?: string;
  rating?: { average?: number; count?: number };
}

interface RatingPromptState {
  open: boolean;
  product: RatePromptProduct | null;
  show: (product: RatePromptProduct) => void;
  close: () => void;
}

export const useRatingPromptStore = create<RatingPromptState>((set) => ({
  open: false,
  product: null,
  show: (product) => set({ open: true, product }),
  close: () => set({ open: false, product: null }),
}));
