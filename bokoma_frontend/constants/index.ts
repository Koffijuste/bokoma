// bokoma_frontend/constants/index.ts
// ============================================================================
// 📦 CONSTANTES GLOBALES — VERSION UNIFIÉE (sans doublons)
// ============================================================================

// ============================================================================
// 🔹 COULEURS
// ============================================================================
export const COLORS = {
  primary: '#a855f7',
  secondary: '#0284c7',
  accent: '#06b6d4',
  background: '#0a0a0a',
  foreground: '#fafafa',
  muted: '#27272a',
  destructive: '#ef4444',
} as const;

// ============================================================================
// 🔹 STORAGE KEYS (localStorage + cookies)
// ============================================================================
export const STORAGE_KEYS = {
  // Auth
  AUTH: 'bokoma_auth',                    // localStorage: { accessToken, user }
  AUTH_TOKEN: 'bokoma_access_token',      // Cookie: access token
  REFRESH_TOKEN: 'bokoma_refresh_token',  // Cookie: refresh token (HttpOnly)
  USER: 'bokoma_user',                    // localStorage: user info
  
  // UI
  CART: 'bokoma_cart',
  THEME: 'bokoma_theme',
  LOCALE: 'bokoma_locale',
} as const;

// ============================================================================
// 🔹 ROUTES (pages frontend — pour <Link href={...}>)
// ============================================================================
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (slug: string) => `/products/${slug}`,
  CATEGORIES: '/categories',
  SEARCH: '/search',
  CART: '/cart',
  CHECKOUT: '/checkout',
  WISHLIST: '/wishlist',
  ABOUT: '/about',
  CONTACT: '/contact',
  PRIVACY: '/privacy-policy',
  TERMS: '/terms',
  FAQ: '/faq',
  GALLERY: '/gallery',
  FEEDBACK: '/feedback',

  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },

  USER: {
    PROFILE: '/profile',
    ORDERS: '/profile/orders',
    ORDER_DETAIL: (id: string) => `/orders/${id}`,
    SETTINGS: '/profile/settings',
    ADDRESSES: '/profile/addresses',
    WISHLIST: '/wishlist',
  },

  ADMIN: {
    DASHBOARD: '/dashboard',
    ORDERS: '/dashboard/orders',
    PRODUCTS: '/dashboard/products',
    CATEGORIES: '/dashboard/categories',
    USERS: '/dashboard/users',
    COUPONS: '/dashboard/coupons',
    REVIEWS: '/dashboard/reviews',
    GALLERY: '/dashboard/gallery',
    FEEDBACKS: '/dashboard/feedbacks',
    SETTINGS: '/dashboard/settings',
    ANALYTICS: '/dashboard/analytics',
  },
} as const;

// ============================================================================
// 🔹 API ENDPOINTS (routes backend — pour apiClient.get/post/...)
// ============================================================================
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: (token: string) => `/auth/reset-password/${token}`,
  },
  
  USERS: {
    ME: '/users/me',
    UPDATE_ME: '/users/me',
    UPDATE_PASSWORD: '/users/me/password',
    UPLOAD_AVATAR: '/users/me/avatar',
    DELETE_AVATAR: '/users/me/avatar',
    ADD_ADDRESS: '/users/me/addresses',
    UPDATE_ADDRESS: (id: string) => `/users/me/addresses/${id}`,
    DELETE_ADDRESS: (id: string) => `/users/me/addresses/${id}`,
    LIST: '/users',
    DETAIL: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },
  
  PRODUCTS: {
    LIST: '/products',
    DETAIL: (slug: string) => `/products/${slug}`,
    CREATE: '/products',
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
    DELETE_IMAGE: (id: string, index: number) => `/products/${id}/images/${index}`,
    FEATURED: '/products/featured',
    SEARCH: '/products/search',
    RELATED: (slug: string) => `/products/${slug}/related`,
  },
  
  CATEGORIES: {
    LIST: '/categories',
    DETAIL: (slug: string) => `/categories/${slug}`,
    CREATE: '/categories',
    UPDATE: (id: string) => `/categories/${id}`,
    DELETE: (id: string) => `/categories/${id}`,
  },
  
  CART: {
    GET: '/cart',
    ADD_ITEM: '/cart/items',
    UPDATE_ITEM: (id: string) => `/cart/items/${id}`,
    REMOVE_ITEM: (id: string) => `/cart/items/${id}`,
    APPLY_COUPON: '/cart/coupon',
    REMOVE_COUPON: '/cart/coupon',
    CLEAR: '/cart',
  },
  
  ORDERS: {
    CREATE: '/orders',
    LIST_MY: '/orders/my',
    LIST_ALL: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
    UPDATE_STATUS: (id: string) => `/orders/${id}/status`,
    STATS: '/orders/stats',
    CANCEL: (id: string) => `/orders/${id}/cancel`,
  },
  
  REVIEWS: {
    LIST: (productId: string) => `/products/${productId}/reviews`,
    CREATE: (productId: string) => `/products/${productId}/reviews`,
    DELETE: (id: string) => `/reviews/${id}`,
    APPROVE: (id: string) => `/reviews/${id}/approve`,
    HELPFUL: (id: string) => `/reviews/${id}/helpful`,
  },
  
  COUPONS: {
    LIST: '/coupons',
    DETAIL: (id: string) => `/coupons/${id}`,
    CREATE: '/coupons',
    UPDATE: (id: string) => `/coupons/${id}`,
    DELETE: (id: string) => `/coupons/${id}`,
    VALIDATE: '/coupons/validate',
  },
  
  DASHBOARD: {
    STATS: '/dashboard/stats',
    SALES_TREND: '/dashboard/sales-trend',
  },

  GALLERY: {
    LIST: '/gallery',
    ADMIN_LIST: '/gallery/admin/list',
    ADMIN_STATS: '/gallery/admin/stats',
    ADMIN_UPLOAD: '/gallery/admin/upload',
    ADMIN_ITEM: '/gallery/admin',
    ADMIN_DETAIL: (id: string) => `/gallery/admin/${id}`,
  },

  FEEDBACKS: {
    LIST: '/feedbacks',
    CATEGORIES: '/feedbacks/categories',
    CREATE: '/feedbacks',
    ADMIN_LIST: '/feedbacks/admin/list',
    ADMIN_STATS: '/feedbacks/admin/stats',
    ADMIN_DETAIL: (id: string) => `/feedbacks/admin/${id}`,
    ADMIN_STATUS: (id: string) => `/feedbacks/admin/${id}/status`,
    ADMIN_DELETE: (id: string) => `/feedbacks/admin/${id}`,
  },
} as const;

// ============================================================================
// 🔹 CONSTANTES MÉTIER
// ============================================================================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 100,
} as const;

export const PRODUCT_TYPES = ['shoes', 'perfume', 'clothing', 'accessory'] as const;
export type ProductType = typeof PRODUCT_TYPES[number];

export const PAYMENT_METHODS = ['card', 'mobile_money', 'cash_on_delivery', 'bank_transfer'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const ORDER_STATUS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;
export type OrderStatus = typeof ORDER_STATUS[number];

export const USER_ROLES = ['customer', 'manager', 'admin'] as const;
export type UserRole = typeof USER_ROLES[number];