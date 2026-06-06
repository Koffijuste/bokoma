// app/constants.ts
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  CATEGORIES: '/products#categories',
  SEARCH: '/search',
  CART: '/cart',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT: '/auth/forgot-password',
    RESET: '/auth/reset-password',
  },
  USER: {
    PROFILE: '/profile',
    ORDERS: '/orders',
    WISHLIST: '/wishlist',
    SETTINGS: '/profile?tab=settings', // ← AJOUTER CETTE LIGNE
    NOTIFICATIONS: '/notifications',
  },
  ADMIN: {
    DASHBOARD: '/dashboard',
    PRODUCTS: '/dashboard/products',
    ORDERS: '/dashboard/orders',
  },
  // ✅ Pages légales (à ajouter)
  PRIVACY: '/privacy-policy',
  TERMS: '/terms',
  FAQ: '/faq',
  CONTACT: '/contact',
  ABOUT: '/about',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'bokoma_access_token',
  REFRESH_TOKEN: 'bokoma_refresh_token',
  USER: 'bokoma_user',
  THEME: 'bokoma_theme',
} as const;