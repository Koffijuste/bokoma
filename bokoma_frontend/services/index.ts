// services/index.ts
// ============================================================================
// 📦 EXPORTS CENTRALISÉS DES SERVICES API
// ============================================================================

import { apiClient } from './api';
import { API_ENDPOINTS } from '@/constants';
import type {
  User,
  Product,
  Category,
  Order,
  Cart,
  Review,
  Coupon,
  ProductFilters,
  OrderFilters,
  PaginatedResponse,
  AuthResponse,
  ApiResponse,
  Image,
  Address,
} from '@/types';

// ============================================================================
// 🔹 TYPES EXPORTÉS (pour réutilisation dans les composants)
// ============================================================================

export interface CartItemOptions {
  variantId?: string;
  size?: string;
  color?: string;
  quantity?: number;
}

export interface CreateOrderPayload {
  items: Array<{
    product: string;
    quantity: number;
    variantId?: string;
    size?: string;
    color?: string;
  }>;
  shipping: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    country: string;
    zipCode?: string;
  };
  paymentMethod: 'card' | 'mobile_money' | 'cash_on_delivery' | 'bank_transfer';
  couponCode?: string;
  notes?: string;
}

export interface CreateReviewPayload {
  rating: number;
  title: string;
  body: string;
  images?: File[];
}

// ============================================================================
// 🔹 AUTH SERVICES — ✅ CORRECTION CRITIQUE
// ============================================================================

export const authApi = {
  // ✅ CORRECTION : Accepter un objet credentials au lieu de 2 arguments séparés
  login: ({ email, password }: { email: string; password: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.LOGIN, { 
      email: email.trim().toLowerCase(), 
      password 
    }),

  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => apiClient.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REGISTER, data),

  refresh: () => apiClient.post<ApiResponse<{ accessToken: string }>>(API_ENDPOINTS.AUTH.REFRESH),

  getMe: () => apiClient.get<ApiResponse<{ user: User }>>(API_ENDPOINTS.AUTH.ME),

  logout: () => apiClient.post<ApiResponse>(API_ENDPOINTS.AUTH.LOGOUT),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.patch<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.RESET_PASSWORD(token), { password }),
};

// ============================================================================
// 🔹 PRODUCT SERVICES
// ============================================================================

export const productApi = {
  getProducts: (filters?: ProductFilters) =>
    apiClient.get<PaginatedResponse<Product>>(API_ENDPOINTS.PRODUCTS.LIST, {
      params: filters,
    }),

  getProduct: async (slug: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(
      API_ENDPOINTS.PRODUCTS.DETAIL(slug)
    );
    
    // ✅ Extraire le produit selon le format de réponse
    if ('product' in response && response.product) return response.product;
    if ('data' in response && response.data && typeof response.data === 'object' && '_id' in response.data) {
      return response.data as unknown as Product;
    }
    if (response && typeof response === 'object' && ('_id' in response || 'id' in response)) {
      return response as unknown as Product;
    }
    throw new Error('Format de réponse produit invalide');
  },

  createProduct: (data: Omit<Product, '_id' | 'slug' | 'createdAt' | 'updatedAt'>, files?: File[]) => {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value == null) return;
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });
    
    files?.forEach((file) => formData.append('images', file));
    
    return apiClient.upload<ApiResponse<{ product: Product }>>(API_ENDPOINTS.PRODUCTS.CREATE, formData);
  },

  updateProduct: (id: string, data: Partial<Product>, files?: File[]) => {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value == null) return;
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });
    
    files?.forEach((file) => formData.append('images', file));
    
    return apiClient.patch<ApiResponse<{ product: Product }>>(API_ENDPOINTS.PRODUCTS.UPDATE(id), formData);
  },

  deleteProduct: (id: string) =>
    apiClient.delete<ApiResponse>(API_ENDPOINTS.PRODUCTS.DELETE(id)),

  deleteProductImage: (productId: string, imageIndex: number) =>
    apiClient.delete<ApiResponse<{ images: Image[] }>>(
      API_ENDPOINTS.PRODUCTS.DELETE_IMAGE(productId, imageIndex)
    ),

  getFeatured: (limit?: number) =>
    apiClient.get<ApiResponse<{ products: Product[] }>>(API_ENDPOINTS.PRODUCTS.FEATURED, {
      params: { limit },
    }),

  search: (query: string, filters?: Omit<ProductFilters, 'search'>) =>
    apiClient.get<PaginatedResponse<Product>>(API_ENDPOINTS.PRODUCTS.SEARCH, {
      params: { search: query, ...filters },
    }),
};

// ============================================================================
// 🔹 CATEGORY SERVICES
// ============================================================================

export const categoryApi = {
  getCategories: (params?: { parent?: string; active?: boolean }) =>
    apiClient.get<ApiResponse<{ categories: Category[] }>>(API_ENDPOINTS.CATEGORIES.LIST, { params }),

  getCategory: (slug: string) =>
    apiClient.get<ApiResponse<{ category: Category }>>(API_ENDPOINTS.CATEGORIES.DETAIL(slug)),

  createCategory: (data: Omit<Category, '_id' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<ApiResponse<{ category: Category }>>(API_ENDPOINTS.CATEGORIES.CREATE, data),

  updateCategory: (id: string, data: Partial<Category>) =>
    apiClient.patch<ApiResponse<{ category: Category }>>(API_ENDPOINTS.CATEGORIES.UPDATE(id), data),

  deleteCategory: (id: string) =>
    apiClient.delete<ApiResponse>(API_ENDPOINTS.CATEGORIES.DELETE(id)),
};

// ============================================================================
// 🔹 CART SERVICES — ✅ CORRECTIONS CRITIQUES
// ============================================================================

export const cartApi = {
  getCart: () => apiClient.get<ApiResponse<{ cart: Cart }>>(API_ENDPOINTS.CART.GET),

  // ✅ CORRECTION : Accepter un objet options + filtrer les undefined
  addItem: (productId: string, options: CartItemOptions = {}) => {
    const { variantId, size, color, quantity = 1 } = options;
    
    // ✅ Ne pas envoyer les champs undefined/null au backend
    const payload: Record<string, any> = { product: productId, quantity };
    if (variantId) payload.variantId = variantId;
    if (size) payload.size = size;
    if (color) payload.color = color;
    
    return apiClient.post<ApiResponse<{ cart: Cart }>>(API_ENDPOINTS.CART.ADD_ITEM, payload);
  },

  updateItem: (itemId: string, quantity: number) =>
    apiClient.patch<ApiResponse<{ cart: Cart }>>(API_ENDPOINTS.CART.UPDATE_ITEM(itemId), { quantity }),

  removeItem: (itemId: string) =>
    apiClient.delete<ApiResponse<{ cart: Cart }>>(API_ENDPOINTS.CART.REMOVE_ITEM(itemId)),

  applyCoupon: (code: string) =>
    apiClient.post<ApiResponse<{ cart: Cart; discount: number }>>(API_ENDPOINTS.CART.APPLY_COUPON, { 
      code: code.toUpperCase() 
    }),

  removeCoupon: () =>
    apiClient.delete<ApiResponse<{ cart: Cart }>>(API_ENDPOINTS.CART.REMOVE_COUPON),

  clearCart: () => apiClient.delete<ApiResponse<{ message: string }>>(API_ENDPOINTS.CART.CLEAR),
};

// ============================================================================
// 🔹 ORDER SERVICES
// ============================================================================

export const orderApi = {
  createOrder: (payload: CreateOrderPayload) =>
    apiClient.post<ApiResponse<{ order: Order }>>(API_ENDPOINTS.ORDERS.CREATE, payload),

  getMyOrders: (filters?: Omit<OrderFilters, 'user'>) =>
    apiClient.get<PaginatedResponse<Order>>(API_ENDPOINTS.ORDERS.LIST_MY, {
      params: filters,
    }),

  getOrder: (id: string) =>
    apiClient.get<ApiResponse<{ order: Order }>>(API_ENDPOINTS.ORDERS.DETAIL(id)),

  getAllOrders: (filters?: OrderFilters) =>
    apiClient.get<PaginatedResponse<Order>>(API_ENDPOINTS.ORDERS.LIST_ALL, {
      params: filters,
    }),

  updateOrderStatus: (id: string, status: string, note?: string) =>
    apiClient.patch<ApiResponse<{ order: Order }>>(API_ENDPOINTS.ORDERS.UPDATE_STATUS(id), {
      status,
      note,
    }),

  getOrderStats: () =>
    apiClient.get<ApiResponse<{
      stats: {
        totalOrders: number;
        totalRevenue: number;
        avgOrder: number;
      };
      byStatus: Array<{ _id: string; count: number }>;
    }>>(API_ENDPOINTS.ORDERS.STATS),

  cancelOrder: (id: string, reason?: string) =>
    apiClient.patch<ApiResponse<{ order: Order }>>(API_ENDPOINTS.ORDERS.CANCEL(id), { reason }),
};

// ============================================================================
// 🔹 REVIEW SERVICES
// ============================================================================

export const reviewApi = {
  getReviews: (productId: string, params?: { page?: number; limit?: number; approved?: boolean }) =>
    apiClient.get<PaginatedResponse<Review>>(API_ENDPOINTS.REVIEWS.LIST(productId), { params }),

  createReview: (productId: string, data: CreateReviewPayload) => {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value == null) return;
      if (key === 'images' && Array.isArray(value)) {
        (value as File[]).forEach((file) => formData.append('images', file));
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });
    
    return apiClient.upload<ApiResponse<{ review: Review }>>(
      API_ENDPOINTS.REVIEWS.CREATE(productId), 
      formData
    );
  },

  deleteReview: (id: string) =>
    apiClient.delete<ApiResponse>(API_ENDPOINTS.REVIEWS.DELETE(id)),

  approveReview: (id: string) =>
    apiClient.patch<ApiResponse<{ review: Review }>>(API_ENDPOINTS.REVIEWS.APPROVE(id)),

  markHelpful: (id: string) =>
    apiClient.post<ApiResponse<{ review: Review }>>(API_ENDPOINTS.REVIEWS.HELPFUL(id)),
};

// ============================================================================
// 🔹 COUPON SERVICES
// ============================================================================

export const couponApi = {
  getCoupons: (params?: { active?: boolean; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Coupon>>(API_ENDPOINTS.COUPONS.LIST, { params }),

  createCoupon: (data: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt' | 'currentUsage'>) =>
    apiClient.post<ApiResponse<{ coupon: Coupon }>>(API_ENDPOINTS.COUPONS.CREATE, data),

  updateCoupon: (id: string, data: Partial<Coupon>) =>
    apiClient.patch<ApiResponse<{ coupon: Coupon }>>(API_ENDPOINTS.COUPONS.UPDATE(id), data),

  deleteCoupon: (id: string) =>
    apiClient.delete<ApiResponse>(API_ENDPOINTS.COUPONS.DELETE(id)),

  validateCoupon: (code: string, cartTotal: number) =>
    apiClient.post<ApiResponse<{ valid: boolean; discount?: number; message?: string }>>(
      API_ENDPOINTS.COUPONS.VALIDATE, 
      { code, cartTotal }
    ),
};

// ============================================================================
// 🔹 USER SERVICES
// ============================================================================

export const userApi = {
  getMe: () => apiClient.get<ApiResponse<{ user: User }>>(API_ENDPOINTS.USERS.ME),

  updateMe: (data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatar'>>) =>
    apiClient.patch<ApiResponse<{ user: User }>>(API_ENDPOINTS.USERS.UPDATE_ME, data),

  updatePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch<ApiResponse>(API_ENDPOINTS.USERS.UPDATE_PASSWORD, { 
      currentPassword, 
      newPassword 
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    // Backend expects PATCH /users/me/avatar (see user.routes)
    return apiClient.patch<ApiResponse<{ user: User }>>(API_ENDPOINTS.USERS.UPLOAD_AVATAR, formData);
  },

  deleteAvatar: () =>
    apiClient.delete<ApiResponse<{ user: User }>>(API_ENDPOINTS.USERS.DELETE_AVATAR),

  addAddress: (address: Omit<Address, '_id'>) =>
    apiClient.post<ApiResponse<{ address: Address }>>(API_ENDPOINTS.USERS.ADD_ADDRESS, address),

  updateAddress: (id: string, address: Partial<Address>) =>
    apiClient.patch<ApiResponse<{ address: Address }>>(API_ENDPOINTS.USERS.UPDATE_ADDRESS(id), address),

  deleteAddress: (id: string) =>
    apiClient.delete<ApiResponse>(API_ENDPOINTS.USERS.DELETE_ADDRESS(id)),

  // Admin only
  getUsers: (filters?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<User>>(API_ENDPOINTS.USERS.LIST, { params: filters }),

  getUser: (id: string) => 
    apiClient.get<ApiResponse<{ user: User }>>(API_ENDPOINTS.USERS.DETAIL(id)),

  updateUser: (id: string, data: Partial<User>) =>
    apiClient.patch<ApiResponse<{ user: User }>>(API_ENDPOINTS.USERS.UPDATE(id), data),

  deleteUser: (id: string) =>
    apiClient.delete<ApiResponse>(API_ENDPOINTS.USERS.DELETE(id)),
};

// ============================================================================
// 🔹 DASHBOARD & ANALYTICS (Admin)
// ============================================================================

export const dashboardApi = {
  getStats: (filters?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<{
      totalOrders: number;
      totalRevenue: number;
      totalProducts: number;
      totalUsers: number;
      recentOrders: Array<Pick<Order, '_id' | 'orderNumber' | 'total' | 'status' | 'createdAt'>>;
      topProducts: Array<Pick<Product, '_id' | 'name' | 'basePrice' | 'soldCount'>>;
    }>>(API_ENDPOINTS.DASHBOARD.STATS, { params: filters }),

  getSalesTrend: (filters: { startDate: string; endDate: string; granularity?: 'day' | 'week' | 'month' }) =>
    apiClient.get<ApiResponse<{
      trend: Array<{ date: string; revenue: number; orders: number }>;
    }>>(API_ENDPOINTS.DASHBOARD.SALES_TREND, { params: filters }),
};

// ============================================================================
// 🔹 SYSTEM & HEALTH
// ============================================================================

export const systemApi = {
  health: () => apiClient.get<{ status: string; timestamp: string; uptime: number }>('/health'),
  config: () => apiClient.get<ApiResponse<{ config: Record<string, any> }>>('/config'),
};