// bokoma_frontend/services/api.ts
// ============================================================================
// 🔌 API CLIENT — Axios avec intercepteurs anti-boucle 401
// ============================================================================

import axios, { 
  AxiosError, 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  InternalAxiosRequestConfig 
} from 'axios';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '@/constants';
import type { 
  ApiError, 
  ApiResponse, 
  AuthResponse, 
  User, 
  AuthPayload, 
  Product, 
  ProductFilters, 
  Category, 
  Cart, 
  Order, 
  OrderFilters, 
  OrderStatus, 
  Review, 
  CreateReviewPayload, 
  Coupon, 
  DashboardStats, 
  AnalyticsFilters 
} from '@/types';

// ============================================================================
// 🔹 API CLIENT CLASS
// ============================================================================

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      withCredentials: true, // ✅ Envoie les cookies automatiquement
      headers: { 'Content-Type': 'application/json' },
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // ── Request Interceptor ──────────────────────────────────────────────
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      // FormData : laisser le navigateur gérer Content-Type
      if (config.data instanceof FormData) {
        const headers = config.headers as Record<string, string>;
        if (headers) delete headers['content-type'];
      }

      // ✅ ATTACHER LE TOKEN — Fallback localStorage → cookie
      if (typeof window !== 'undefined') {
        try {
          // Priorité 1: localStorage
          const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
          if (stored) {
            const parsed = JSON.parse(stored);
            const token = parsed?.accessToken || parsed;
            
            if (token && typeof token === 'string' && token.startsWith('ey')) {
              if (!config.headers) config.headers = {} as any;
              config.headers.Authorization = `Bearer ${token}`;
              return config;
            }
          }
          
          // Priorité 2: Cookie fallback
          const cookieName = STORAGE_KEYS.AUTH_TOKEN || 'bokoma_access_token';
          const cookieToken = document.cookie
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith(`${cookieName}=`))
            ?.split('=')[1];
          
          if (cookieToken && config.headers) {
            config.headers.Authorization = `Bearer ${cookieToken}`;
            if (process.env.NODE_ENV === 'development') {
              console.log('🍪 [Axios] Using token from cookie:', `${cookieToken.slice(0, 20)}...`);
            }
          }
        } catch (err) {
          console.warn('⚠️ [Axios] Failed to attach auth token:', err);
        }
      }
      
      return config;
    }, (error: AxiosError) => Promise.reject(this.formatError(error)));

    // ── Response Interceptor — ANTI-BOUCLE 401 ───────────────────────────
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { 
          _retry?: boolean;
          _isRefresh?: boolean;
        };

        // ✅ Routes auth à exclure du refresh automatique
        const isAuthRoute = 
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/forgot-password') ||
          originalRequest.url?.includes('/auth/reset-password');

        // ✅ Si 401 ET pas déjà retryé ET pas une route auth
        if (error.response?.status === 401 && 
            !originalRequest?._retry && 
            !originalRequest?._isRefresh &&
            !isAuthRoute) {
          
          originalRequest._retry = true;

          // ✅ Si déjà en train de refresh, mettre en file d'attente
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.refreshSubscribers.push((newToken: string) => {
                if (newToken && originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                this.client(originalRequest).then(resolve).catch(reject);
              });
            });
          }

          this.isRefreshing = true;
          
          try {
            // ✅ Tenter refresh avec withCredentials pour envoyer les cookies
            const refreshResponse = await this.client.post<{ 
              success: boolean; 
              data?: { accessToken: string };
              accessToken?: string;
            }>('/auth/refresh', {}, { 
              withCredentials: true,
              _isRefresh: true, // ✅ Marquer comme requête de refresh
            });
            
            // ✅ Extraire le token selon le format de réponse
            const accessToken = 
              refreshResponse.data?.data?.accessToken || 
              refreshResponse.data?.accessToken ||
              (refreshResponse.data as any)?.accessToken;
            
            if (!accessToken) {
              throw new Error('No access token in refresh response');
            }
            
            // ✅ Mettre à jour le header de la requête originale
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            
            // ✅ Stocker dans localStorage pour cohérence
            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  parsed.accessToken = accessToken;
                  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(parsed));
                } catch {
                  // Ignore parse errors
                }
              }
            }
            
            // ✅ Notifier les requêtes en attente
            this.refreshSubscribers.forEach(cb => cb(accessToken));
            this.refreshSubscribers = [];
            
            // ✅ Rejouer la requête originale
            return this.client(originalRequest);
            
          } catch (refreshError) {
            // ✅ Refresh échoué → DÉCONNEXION PROPRE + REDIRECTION
            console.error('❌ [ApiClient] Refresh failed, logging out');
            
            this.clearAuth();
            this.refreshSubscribers.forEach(cb => cb(''));
            this.refreshSubscribers = [];
            
            // ✅ Redirection IMMÉDIATE vers login (évite la boucle)
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              
              // Ne pas rediriger si déjà sur une page auth
              if (!currentPath.includes('/auth')) {
                const from = currentPath + window.location.search;
                window.location.href = `/auth/login?from=${encodeURIComponent(from)}`;
              }
            }
            
            return Promise.reject(this.formatError(error));
            
          } finally {
            this.isRefreshing = false;
          }
        }
        
        // ✅ Pour les autres erreurs, juste rejeter
        return Promise.reject(this.formatError(error));
      }
    );
  }

  private clearAuth() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      localStorage.removeItem(STORAGE_KEYS.USER);
      
      // Supprimer aussi les cookies
      Cookies.remove(STORAGE_KEYS.AUTH_TOKEN, { path: '/' });
      Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: '/' });
      
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  private formatError(error: AxiosError<ApiResponse>): ApiError {
    return {
      statusCode: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'Une erreur est survenue',
      errors: error.response?.data?.errors,
      isOperational: !!error.response,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }

  // ── HTTP Methods ───────────────────────────────────────────────────────
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.get<T>(url, config);
    return res.data;
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.post<T>(url, data, config);
    return res.data;
  }
  
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.patch<T>(url, data, config);
    return res.data;
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.put<T>(url, data, config);
    return res.data;
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.delete<T>(url, config);
    return res.data;
  }
  
  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.post<T>(url, formData, {
      ...config,
      headers: { ...config?.headers, 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  getClient(): AxiosInstance { 
    return this.client; 
  }
}

export const apiClient = new ApiClient();
export default apiClient;

// ============================================================================
// 🔹 API SERVICES
// ============================================================================

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    if (!credentials || typeof credentials !== 'object') {
      throw new Error('Credentials must be an object');
    }

    const email = typeof credentials.email === 'string' 
      ? credentials.email.trim().toLowerCase() 
      : '';
      
    const password = typeof credentials.password === 'string' 
      ? credentials.password 
      : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Format email invalide');
    }
    
    if (!password || password.length < 6) {
      throw new Error('Mot de passe invalide (minimum 6 caractères)');
    }

    const payload = { email, password };

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [authApi.login] FINAL payload:', {
        emailType: typeof payload.email,
        emailValue: payload.email,
        passwordType: typeof payload.password,
        passwordLength: payload.password?.length,
      });
    }
    
    return apiClient.post<ApiResponse<AuthPayload>>('/auth/login', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
  },
  
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data),
    
  getMe: () => apiClient.get<ApiResponse<{ user: User }>>('/auth/me'),
  
  logout: () => apiClient.post<ApiResponse>('/auth/logout'),
  
  refreshToken: () => apiClient.post<{ 
    success: boolean;
    data?: { accessToken: string };
    accessToken?: string;
  }>('/auth/refresh', {}, {
    withCredentials: true,
  }),
  
  forgotPassword: (email: string) => 
    apiClient.post<ApiResponse>('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, newPassword: string) =>
    apiClient.patch<ApiResponse<AuthResponse>>(`/auth/reset-password/${token}`, { password: newPassword }),
};

export const userApi = {
  getProfile: () => apiClient.get<ApiResponse<{ user: User }>>('/users/me'),
  updateProfile: (data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatar'>>) =>
    apiClient.patch<ApiResponse<{ user: User }>>('/users/me', data),
  updatePassword: (current: string, next: string) =>
    apiClient.patch<ApiResponse>('/users/me/password', { currentPassword: current, newPassword: next }),
  addAddress: (addr: any) => apiClient.post<ApiResponse<{ address: any }>>('/users/me/addresses', addr),
  updateAddress: (id: string, data: any) => apiClient.patch<ApiResponse<{ address: any }>>(`/users/me/addresses/${id}`, data),
  deleteAddress: (id: string) => apiClient.delete<ApiResponse>(`/users/me/addresses/${id}`),
  getUsers: (filters?: any) => apiClient.get<ApiResponse<{ users: User[]; total: number }>>('/users', { params: filters }),
  getUser: (id: string) => apiClient.get<ApiResponse<{ user: User }>>(`/users/${id}`),
  updateUser: (id: string, data: Partial<User>) => apiClient.patch<ApiResponse<{ user: User }>>(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete<ApiResponse>(`/users/${id}`),
};

export const categoryApi = {
  getCategories: (params?: any) => apiClient.get<ApiResponse<{ categories: Category[] }>>('/categories', { params }),
  getCategory: (slug: string) => apiClient.get<ApiResponse<{ category: Category }>>(`/categories/${slug}`),
  createCategory: (data: any) => apiClient.post<ApiResponse<{ category: Category }>>('/categories', data),
  updateCategory: (id: string, data: any) => apiClient.patch<ApiResponse<{ category: Category }>>(`/categories/${id}`, data),
  deleteCategory: (id: string) => apiClient.delete<ApiResponse>(`/categories/${id}`),
};

export const productApi = {
  getProducts: (filters?: ProductFilters) => apiClient.get<ApiResponse<{ products: Product[]; total: number }>>('/products', { params: filters }),
  getProduct: (slug: string) => apiClient.get<ApiResponse<{ product: Product }>>(`/products/${slug}`),
  getFeatured: (limit?: number) => apiClient.get<ApiResponse<{ products: Product[] }>>('/products/featured', { params: { limit } }),
  getRelated: (slug: string, limit?: number) => apiClient.get<ApiResponse<{ products: Product[] }>>(`/products/${slug}/related`, { params: { limit } }),
  search: (query: string, filters?: any) => apiClient.get<ApiResponse<{ products: Product[]; total: number }>>('/products/search', { params: { search: query, ...filters } }),
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

export const cartApi = {
  getCart: () => apiClient.get<ApiResponse<{ cart: Cart }>>('/cart'),
  addItem: (productId: string, opts: { variantId?: string; size?: string; color?: string; quantity?: number } = {}) =>
    apiClient.post<ApiResponse<{ cart: Cart }>>('/cart/items', { product: productId, quantity: 1, ...opts }),
  updateItem: (itemId: string, quantity: number) => apiClient.patch<ApiResponse<{ cart: Cart }>>(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => apiClient.delete<ApiResponse<{ cart: Cart }>>(`/cart/items/${itemId}`),
  clearCart: () => apiClient.delete<ApiResponse<{ message: string }>>('/cart'),
  applyCoupon: (code: string) => apiClient.post<ApiResponse<{ cart: Cart; discount: number }>>('/cart/coupon', { code: code.toUpperCase() }),
  removeCoupon: () => apiClient.delete<ApiResponse<{ cart: Cart }>>('/cart/coupon'),
};

export const orderApi = {
  getOrders: (filters?: OrderFilters) => apiClient.get<ApiResponse<{ orders: Order[]; total: number }>>('/orders', { params: filters }),
  getOrder: (id: string) => apiClient.get<ApiResponse<{ order: Order }>>(`/orders/${id}`),
  getMyOrders: (filters?: any) => apiClient.get<ApiResponse<{ orders: Order[]; total: number }>>('/orders/my', { params: filters }),
  getOrderStats: () => apiClient.get<ApiResponse<{ stats: Record<OrderStatus, number> }>>('/orders/stats'),
  createOrder: (payload: any) => apiClient.post<ApiResponse<{ order: Order }>>('/orders', payload),
  cancelOrder: (id: string, reason?: string) => apiClient.patch<ApiResponse<{ order: Order }>>(`/orders/${id}/cancel`, { reason }),
  updateOrderStatus: (id: string, status: OrderStatus, note?: string) =>
    apiClient.patch<ApiResponse<{ order: Order }>>(`/orders/${id}/status`, { status, note }),
    // ✅ NOUVEAU : Vérification publique du paiement
  verifyPaymentPublic: async (params: {
    orderId?: string;
    merchantTransactionId?: string;
    transactionId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.orderId) queryParams.append('orderId', params.orderId);
    if (params.merchantTransactionId) queryParams.append('merchantTransactionId', params.merchantTransactionId);
    if (params.transactionId) queryParams.append('transactionId', params.transactionId);
    
    const response = await apiClient.get(`/orders/verify/payment?${queryParams.toString()}`);
    return response.data;
  },
};

export const reviewApi = {
  getProductReviews: (slug: string, params?: any) => apiClient.get<ApiResponse<{ reviews: Review[]; total: number }>>(`/products/${slug}/reviews`, { params }),
  createReview: (slug: string, data: CreateReviewPayload) => apiClient.post<ApiResponse<{ review: Review }>>(`/products/${slug}/reviews`, data),
  updateReview: (id: string, data: Partial<CreateReviewPayload>) => apiClient.patch<ApiResponse<{ review: Review }>>(`/reviews/${id}`, data),
  deleteReview: (id: string) => apiClient.delete<ApiResponse>(`/reviews/${id}`),
  markHelpful: (id: string) => apiClient.post<ApiResponse<{ review: Review }>>(`/reviews/${id}/helpful`),
  approveReview: (id: string) => apiClient.patch<ApiResponse<{ review: Review }>>(`/reviews/${id}/approve`),
};

export const couponApi = {
  validateCoupon: (code: string, total: number) => apiClient.post<ApiResponse<{ valid: boolean; discount?: number }>>('/coupons/validate', { code, cartTotal: total }),
  getCoupons: (params?: any) => apiClient.get<ApiResponse<{ coupons: Coupon[]; total: number }>>('/coupons', { params }),
  createCoupon: (data: any) => apiClient.post<ApiResponse<{ coupon: Coupon }>>('/coupons', data),
  updateCoupon: (id: string, data: any) => apiClient.patch<ApiResponse<{ coupon: Coupon }>>(`/coupons/${id}`, data),
  deleteCoupon: (id: string) => apiClient.delete<ApiResponse>(`/coupons/${id}`),
};

export const dashboardApi = {
  getStats: (filters?: AnalyticsFilters) => apiClient.get<ApiResponse<{ stats: DashboardStats }>>('/dashboard/stats', { params: filters }),
  getSalesTrend: (filters: AnalyticsFilters) => apiClient.get<ApiResponse<{ trend: any[] }>>('/dashboard/sales-trend', { params: filters }),
  getTopProducts: (limit?: number, filters?: any) => apiClient.get<ApiResponse<{ products: any[] }>>('/dashboard/top-products', { params: { limit, ...filters } }),
};

export const systemApi = {
  health: () => apiClient.get<{ status: string; timestamp: string; uptime: number }>('/health'),
  config: () => apiClient.get<ApiResponse<{ config: Record<string, any> }>>('/config'),
};