// services/index.ts
// Point d'entrée unique des services API.
// Ré-exporte apiClient + services de base depuis ./api (source unique),
// puis expose les services additionnels (gallery, feedback, etc.).

import { apiClient } from './api';
import { API_ENDPOINTS } from '@/constants';
import type {
  GalleryItem,
  CreateGalleryItemPayload,
  FeedbackItem,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackCategoryInfo,
  CreateFeedbackPayload,
} from '@/types';

export { apiClient, default } from './api';
export {
  authApi,
  userApi,
  categoryApi,
  productApi,
  cartApi,
  orderApi,
  reviewApi,
  couponApi,
  dashboardApi,
  systemApi,
} from './api';

export interface CartItemOptions {
  variantId?: string;
  size?: string;
  color?: string;
  quantity?: number;
}

export interface CreateOrderPayload {
  shipping: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    country: string;
    zipCode?: string;
  };
  payment?: { method: 'card' | 'mobile_money' | 'cash_on_delivery' | 'bank_transfer' };
  paymentMethod?: 'card' | 'mobile_money' | 'cash_on_delivery' | 'bank_transfer';
  couponCode?: string;
  notes?: string;
}

export interface CreateReviewPayload {
  rating: number;
  title: string;
  body: string;
  images?: File[];
}

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

export interface AdminReviewListResponse {
  reviews: any[];
  pagination: { page: number; pages: number; total: number };
}

// Gallery ────────────────────────────────────────────────────────────────────

export const galleryApi = {
  list: (params?: { page?: number; limit?: number; type?: 'image' | 'video'; category?: string; featured?: boolean }) =>
    apiClient.get<any>(API_ENDPOINTS.GALLERY.LIST, { params }),

  get: (id: string) =>
    apiClient.get<any>(`/gallery/${id}`),

  adminList: (params?: { page?: number; limit?: number; type?: string; category?: string; isPublished?: boolean }) =>
    apiClient.get<any>(API_ENDPOINTS.GALLERY.ADMIN_LIST, { params }),

  adminStats: () =>
    apiClient.get<any>(API_ENDPOINTS.GALLERY.ADMIN_STATS),

  uploadMedia: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.upload<any>(API_ENDPOINTS.GALLERY.ADMIN_UPLOAD, fd);
  },

  create: (data: CreateGalleryItemPayload, file?: File) => {
    if (!file) {
      return apiClient.post<any>(API_ENDPOINTS.GALLERY.ADMIN_ITEM, data);
    }
    const fd = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value == null) return;
      if (Array.isArray(value) || typeof value === 'object') {
        fd.append(key, JSON.stringify(value));
      } else {
        fd.append(key, String(value));
      }
    });
    fd.append('file', file);
    return apiClient.upload<any>(API_ENDPOINTS.GALLERY.ADMIN_ITEM, fd);
  },

  update: (id: string, data: Partial<CreateGalleryItemPayload>, file?: File) => {
    if (!file) {
      return apiClient.patch<any>(API_ENDPOINTS.GALLERY.ADMIN_DETAIL(id), data);
    }
    const fd = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value == null) return;
      if (Array.isArray(value) || typeof value === 'object') {
        fd.append(key, JSON.stringify(value));
      } else {
        fd.append(key, String(value));
      }
    });
    fd.append('file', file);
    return apiClient.patch<any>(API_ENDPOINTS.GALLERY.ADMIN_DETAIL(id), fd);
  },

  remove: (id: string) =>
    apiClient.delete<any>(API_ENDPOINTS.GALLERY.ADMIN_DETAIL(id)),
};

// Feedback ───────────────────────────────────────────────────────────────────

export const feedbackApi = {
  categories: () =>
    apiClient.get<any>(API_ENDPOINTS.FEEDBACKS.CATEGORIES),

  list: (params?: { page?: number; limit?: number; category?: FeedbackCategory }) =>
    apiClient.get<any>(API_ENDPOINTS.FEEDBACKS.LIST, { params }),

  create: (payload: CreateFeedbackPayload) =>
    apiClient.post<any>(API_ENDPOINTS.FEEDBACKS.CREATE, payload),

  adminList: (params?: { page?: number; limit?: number; status?: FeedbackStatus; category?: FeedbackCategory }) =>
    apiClient.get<any>(API_ENDPOINTS.FEEDBACKS.ADMIN_LIST, { params }),

  adminStats: () =>
    apiClient.get<any>(API_ENDPOINTS.FEEDBACKS.ADMIN_STATS),

  adminGet: (id: string) =>
    apiClient.get<any>(API_ENDPOINTS.FEEDBACKS.ADMIN_DETAIL(id)),

  adminUpdateStatus: (id: string, body: { status?: FeedbackStatus; isPublic?: boolean; isAnonymous?: boolean; adminResponse?: string }) =>
    apiClient.patch<any>(API_ENDPOINTS.FEEDBACKS.ADMIN_STATUS(id), body),

  adminRemove: (id: string) =>
    apiClient.delete<any>(API_ENDPOINTS.FEEDBACKS.ADMIN_DELETE(id)),
};