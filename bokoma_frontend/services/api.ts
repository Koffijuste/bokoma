// services/api.ts
// ============================================================================
// 🔌 API CLIENT — Cookie httpOnly only, refresh queue anti-loop
// ============================================================================

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import type {
  ApiError, ApiResponse, AuthResponse, AuthPayload,
  User, Product, ProductFilters, Category,
  Cart, Order, OrderFilters, OrderStatus,
  Review, CreateReviewPayload, Coupon,
  DashboardStats, AnalyticsFilters,
} from '@/types';

// ─── Types internes ───────────────────────────────────────────────────────────

type QueueItem = {
  resolve: () => void;
  reject: (err: any) => void;
};

type ExtendedConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _isRefresh?: boolean;
};

// ============================================================================
// 🔹 PUBLIC PATHS — Mirror exact de middleware.ts (côté Edge)
// ============================================================================
// ⚠️ Si tu ajoutes une route publique dans middleware.ts, AJOUTE-LA ICI aussi.
//    Sinon l'interceptor va rediriger les visiteurs non-authentifiés hors de
//    cette route, alors que le middleware Edge les laissait passer.
// ============================================================================
const PUBLIC_PATHS: readonly string[] = [
  '/',
  '/products',
  '/search',
  '/categories',
  '/auth/login',
  '/auth/register',
  '/auth/forgot',
  '/auth/reset-password',
  '/api/v1/health',
];

const isPublicPath = (path: string): boolean => {
  if (!path) return false;
  return PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + '/'),
  );
};

// ============================================================================
// 🔹 API CLIENT
// ============================================================================

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private queue: QueueItem[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
      timeout: 30_000,
      // ✅ CRITIQUE : envoie automatiquement les cookies httpOnly
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  // ─── Intercepteurs ──────────────────────────────────────────────────────────

  private setupInterceptors() {
    // ── REQUEST ──────────────────────────────────────────────────────────────
    this.client.interceptors.request.use((config: ExtendedConfig) => {
      // FormData → laisser le navigateur calculer le boundary multipart
      if (config.data instanceof FormData) {
        delete (config.headers as any)['Content-Type'];
      } else if (config.data !== undefined) {
        config.headers['Content-Type'] = 'application/json';
      }

      // ✅ PAS de lecture localStorage — les cookies httpOnly sont envoyés
      // automatiquement par le navigateur grâce à withCredentials: true

      return config;
    });

    // ── RESPONSE ─────────────────────────────────────────────────────────────
    this.client.interceptors.response.use(
      (res) => res,
      async (error: AxiosError<ApiResponse>) => {
        const config = error.config as ExtendedConfig;
        const status = error.response?.status;

        // Timeout réseau
        if (error.code === 'ECONNABORTED') {
          return Promise.reject(this.toApiError(error, 'Délai de réponse dépassé'));
        }

        // Routes auth exclues du refresh automatique
        const isAuthRoute = ['/auth/login', '/auth/register', '/auth/refresh',
          '/auth/forgot-password', '/auth/reset-password']
          .some(r => config?.url?.includes(r));

        // ── Auto-refresh sur 401 ────────────────────────────────────────────
        if (status === 401 && !config?._retry && !config?._isRefresh && !isAuthRoute) {
          config._retry = true;

          // Déjà en train de refresh → mettre en file d'attente
          if (this.isRefreshing) {
            return new Promise<void>((resolve, reject) => {
              this.queue.push({ resolve, reject });
            }).then(() => this.client(config));
          }

          this.isRefreshing = true;

          try {
            // Le cookie bokoma_refresh_token est envoyé automatiquement
            await this.client.post('/auth/refresh', {}, {
              withCredentials: true,
              _isRefresh: true,
            } as ExtendedConfig);

            // Refresh OK → vider la file d'attente
            this.flushQueue();

            // Rejouer la requête originale (cookie mis à jour par le backend)
            return this.client(config);

          } catch (refreshError) {
            this.flushQueue(refreshError);

            // Session définitivement expirée → déconnexion propre
            this.onSessionExpired();

            return Promise.reject(this.toApiError(error));
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.toApiError(error));
      }
    );
  }

  // ─── Helpers privés ─────────────────────────────────────────────────────────

  private flushQueue(error?: any) {
    this.queue.forEach(({ resolve, reject }) =>
      error ? reject(error) : resolve()
    );
    this.queue = [];
  }

  private onSessionExpired() {
    if (typeof window === 'undefined') return;

    // ✅ L'authStore écoute cet événement pour reset le state user
    //    → on le dispatch TOUJOURS, même sur les pages publiques
    window.dispatchEvent(new CustomEvent('bokoma:session-expired'));

    // 🛡️ Garde-fou : on ne redirige JAMAIS depuis une page publique.
    //    Sinon, l'interceptor bouffe le 401 avant que le composant puisse
    //    afficher son état d'erreur, et l'utilisateur se fait ejecter
    //    depuis /products ou / sans avoir rien demandé.
    //
    //    Pages publiques = celles que middleware.ts laisse passer sans token.
    //    La redirection vers /auth/login doit être déclenchée par useRequireAuth
    //    (qui sait quelles routes exigent l'auth), pas par l'interceptor.
    const path = window.location.pathname;

    if (path.startsWith('/auth')) return;            // on est déjà sur /auth → no-op
    if (isPublicPath(path)) return;                  // page publique → no-op

    window.location.href = `/auth/login?from=${encodeURIComponent(path)}`;
  }

  private toApiError(error: AxiosError<ApiResponse>, overrideMsg?: string): ApiError {
    return {
      statusCode: error.response?.status || 500,
      message: overrideMsg
        || error.response?.data?.message
        || error.message
        || 'Une erreur est survenue',
      errors: error.response?.data?.errors,
      isOperational: !!error.response,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    };
  }

  // ─── Méthodes HTTP ──────────────────────────────────────────────────────────

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.get<T>(url, config)).data;
  }

  async post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.post<T>(url, data, config)).data;
  }

  async patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.patch<T>(url, data, config)).data;
  }

  async put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.put<T>(url, data, config)).data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.delete<T>(url, config)).data;
  }

  async upload<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.post<T>(url, formData, config)).data;
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
export const apiClient = new ApiClient();
export default apiClient;

// ============================================================================
// 🔹 API SERVICES
// ============================================================================

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post<ApiResponse<AuthPayload>>('/auth/login', credentials),

  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string; address?: string; country?: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data),

  getMe: () =>
    apiClient.get<ApiResponse<{ user: User }>>('/auth/me'),

  logout: () =>
    apiClient.post<ApiResponse>('/auth/logout'),

  refresh: () =>
    apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh'),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse & { devOtp?: string; expiresIn?: number }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.patch<ApiResponse<AuthResponse>>(`/auth/reset-password/${token}`, { password }),

  resetPasswordWithOtp: (payload: { email: string; otp: string; password: string }) =>
    apiClient.post<ApiResponse>('/auth/reset-password-otp', payload),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile:     () => apiClient.get<ApiResponse<{ user: User }>>('/auth/me'),
  updateProfile:  (data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatar'>>) =>
                    apiClient.patch<ApiResponse<{ user: User }>>('/auth/me', data),
  updatePassword: (currentPassword: string, newPassword: string) =>
                    apiClient.patch<ApiResponse>('/auth/me/password', { currentPassword, newPassword }),
  getUsers:       (filters?: any) => apiClient.get<ApiResponse<{ users: User[]; total: number }>>('/users', { params: filters }),
  getUser:        (id: string) => apiClient.get<ApiResponse<{ user: User }>>(`/users/${id}`),
  updateUser:     (id: string, data: Partial<User>) => apiClient.patch<ApiResponse<{ user: User }>>(`/users/${id}`, data),
  deleteUser:     (id: string) => apiClient.delete<ApiResponse>(`/users/${id}`),
  toggleUserStatus: (id: string, isActive: boolean) => apiClient.patch<ApiResponse<{ user: User }>>(`/users/${id}/status`, { isActive }),
};

// ── Categories ────────────────────────────────────────────────────────────────
export const categoryApi = {
  getCategories:  (params?: any) => apiClient.get<ApiResponse<{ categories: Category[] }>>('/categories', { params }),
  getCategory:    (slug: string) => apiClient.get<ApiResponse<{ category: Category }>>(`/categories/${slug}`),
  createCategory: (data: any) => apiClient.post<ApiResponse<{ category: Category }>>('/categories', data),
  updateCategory: (id: string, data: any) => apiClient.patch<ApiResponse<{ category: Category }>>(`/categories/${id}`, data),
  deleteCategory: (id: string) => apiClient.delete<ApiResponse>(`/categories/${id}`),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productApi = {
  getProducts:  (filters?: ProductFilters) =>
    apiClient.get<ApiResponse<{ products: Product[]; total: number }>>('/products', { params: filters }),
  getProduct:   (slug: string) => apiClient.get<ApiResponse<{ product: Product }>>(`/products/${slug}`),
  getFeatured:  (limit?: number) => apiClient.get<ApiResponse<{ products: Product[] }>>('/products/featured', { params: { limit } }),
  getRelated:   (slug: string, limit?: number) =>
    apiClient.get<ApiResponse<{ products: Product[] }>>(`/products/${slug}/related`, { params: { limit } }),
  search:       (query: string, filters?: any) =>
    apiClient.get<ApiResponse<{ products: Product[]; total: number }>>('/products/search', { params: { search: query, ...filters } }),

  createProduct: (data: any, images?: File[]) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]: [string, any]) => {
      if (v != null) fd.append(k, typeof v === 'object' && !(v instanceof File) ? JSON.stringify(v) : v);
    });
    images?.forEach(img => fd.append('images', img));
    return apiClient.upload<ApiResponse<{ product: Product }>>('/products', fd);
  },

  updateProduct: (id: string, data: any, images?: File[]) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]: [string, any]) => {
      if (v != null) fd.append(k, typeof v === 'object' && !(v instanceof File) ? JSON.stringify(v) : v);
    });
    images?.forEach(img => fd.append('images', img));
    return apiClient.patch<ApiResponse<{ product: Product }>>(`/products/${id}`, fd);
  },

  deleteProduct: (id: string) => apiClient.delete<ApiResponse>(`/products/${id}`),
};

// ── Cart ──────────────────────────────────────────────────────────────────────
export const cartApi = {
  getCart:      () => apiClient.get<ApiResponse<{ cart: Cart }>>('/cart'),
  addItem:      (productId: string, opts: { variantId?: string; size?: string; color?: string; quantity?: number } = {}) =>
                  apiClient.post<ApiResponse<{ cart: Cart }>>('/cart/items', { product: productId, quantity: 1, ...opts }),
  updateItem:   (itemId: string, quantity: number) =>
                  apiClient.patch<ApiResponse<{ cart: Cart }>>(`/cart/items/${itemId}`, { quantity }),
  removeItem:   (itemId: string) => apiClient.delete<ApiResponse<{ cart: Cart }>>(`/cart/items/${itemId}`),
  clearCart:    () => apiClient.delete<ApiResponse>('/cart'),
  applyCoupon:  (code: string) =>
                  apiClient.post<ApiResponse<{ cart: Cart; discount: number }>>('/cart/coupon', { code: code.toUpperCase() }),
  removeCoupon: () => apiClient.delete<ApiResponse<{ cart: Cart }>>('/cart/coupon'),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderApi = {
  getOrders:       (filters?: OrderFilters) =>
                     apiClient.get<ApiResponse<{ orders: Order[]; pagination?: any }>>('/orders', { params: filters }),
  getAllOrders:    (filters?: OrderFilters) =>
                     apiClient.get<ApiResponse<{ orders: Order[]; pagination?: any }>>('/orders', { params: filters }),
  getOrder:        (id: string) => apiClient.get<ApiResponse<{ order: Order }>>(`/orders/${id}`),
  getMyOrders:     (filters?: any) =>
                     apiClient.get<ApiResponse<{ orders: Order[]; pagination?: any }>>('/orders/my', { params: filters }),
  getOrderStats:   (params?: { days?: number }) =>
                     apiClient.get<ApiResponse<{ stats: any; period?: any }>>('/orders/stats', { params }),
  createOrder:     (payload: any) =>
                     apiClient.post<ApiResponse<{ order: Order; payment?: any }>>('/orders', payload),
  updateOrderStatus: (id: string, status: OrderStatus | string, note?: string, trackingNumber?: string) =>
                     apiClient.patch<ApiResponse<{ order: Order }>>(`/orders/${id}/status`, { status, note, trackingNumber }),
  cancelOrder:     (id: string, reason?: string) =>
                     apiClient.patch<ApiResponse<{ order: Order }>>(`/orders/${id}/cancel`, { reason }),
  deleteOrder:     (id: string) => apiClient.delete<ApiResponse>(`/orders/${id}`),

  verifyPaymentPublic: (params: { orderId?: string | null; merchantTransactionId?: string | null }) => {
    const id = params.orderId || params.merchantTransactionId;
    if (!id) throw new Error('Identifiant de commande manquant');
    return apiClient.get<ApiResponse<{ order: Order }>>(`/orders/verify/${id}`);
  },
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export interface AdminReviewFilters {
  page?: number;
  limit?: number;
  approved?: boolean;
  sortBy?: 'createdAt' | 'rating' | 'helpful';
  sortOrder?: 'asc' | 'desc';
}
export interface AdminReviewStats {
  totalReviews: number;
  approvedCount: number;
  pendingCount: number;
  averageRating: number;
}

export const reviewApi = {
  getProductReviews: (slug: string, params?: any) =>
    apiClient.get<ApiResponse<{ reviews: Review[]; total: number }>>(`/products/${slug}/reviews`, { params }),
  createReview:  (slug: string, data: CreateReviewPayload) =>
    apiClient.post<ApiResponse<{ review: Review }>>(`/products/${slug}/reviews`, data),
  updateReview:  (id: string, data: Partial<CreateReviewPayload>) =>
    apiClient.patch<ApiResponse<{ review: Review }>>(`/reviews/${id}`, data),
  deleteReview:  (id: string) => apiClient.delete<ApiResponse>(`/reviews/${id}`),
  markHelpful:   (id: string) => apiClient.post<ApiResponse<{ review: Review }>>(`/reviews/${id}/helpful`),
  approveReview: (id: string) => apiClient.patch<ApiResponse<{ review: Review }>>(`/reviews/${id}/approve`),
  // Admin
  adminList: (params?: AdminReviewFilters) =>
    apiClient.get<ApiResponse<{ reviews: Review[]; pagination: { page: number; pages: number; total: number } }>>(
      `/reviews`,
      { params },
    ),
  adminStats: () =>
    apiClient.get<ApiResponse<AdminReviewStats>>(`/reviews/stats`),
  rejectReview: (id: string) =>
    apiClient.patch<ApiResponse<{ review: Review }>>(`/reviews/${id}/reject`),
};

// ── Coupons ───────────────────────────────────────────────────────────────────
export const couponApi = {
  validateCoupon: (code: string, total: number) =>
    apiClient.post<ApiResponse<{ valid: boolean; discount?: number }>>('/coupons/validate', { code, cartTotal: total }),
  getCoupons:    (params?: any) => apiClient.get<ApiResponse<{ coupons: Coupon[]; total: number }>>('/coupons', { params }),
  createCoupon:  (data: any) => apiClient.post<ApiResponse<{ coupon: Coupon }>>('/coupons', data),
  updateCoupon:  (id: string, data: any) => apiClient.patch<ApiResponse<{ coupon: Coupon }>>(`/coupons/${id}`, data),
  deleteCoupon:  (id: string) => apiClient.delete<ApiResponse>(`/coupons/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats:      (filters?: AnalyticsFilters) =>
    apiClient.get<ApiResponse<{ stats: DashboardStats }>>('/dashboard/stats', { params: filters }),
  getSalesTrend: (filters: AnalyticsFilters) =>
    apiClient.get<ApiResponse<{ trend: any[] }>>('/dashboard/sales-trend', { params: filters }),
  getTopProducts: (limit?: number, filters?: any) =>
    apiClient.get<ApiResponse<{ products: any[] }>>('/dashboard/top-products', { params: { limit, ...filters } }),
};

// ── System ────────────────────────────────────────────────────────────────────
export const systemApi = {
  health: () => apiClient.get<{ status: string; timestamp: string; uptime: number }>('/health'),
};