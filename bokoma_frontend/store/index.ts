// store/index.ts
// ============================================================================
// 📦 STORE INDEX — Point d'entrée unique pour tous les stores
// ============================================================================

// ✅ Auth store
export { useAuthStore } from './auth';

// ✅ Cart store
export { useCartStore } from './cart';

// ✅ UI store (sidebar, modals, theme)
export { useUiStore } from './ui';

// ✅ Wishlist store
export { useWishlistStore } from './wishlist';

// ✅ Notification store
export { useNotificationStore } from './notification';

// ✅ Product store
export { useProductStore } from './product';

// ✅ Rating prompt store (modale "noter ce produit" après ajout panier)
export { useRatingPromptStore } from './ratingPrompt';