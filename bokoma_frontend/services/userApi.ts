// src/services/userApi.ts
import { api } from '@/lib/axios'; // ✅ Instance Axios avec intercepteur JWT
import type { User } from '@/types';

// ──────────────────────────────────────────────────────────────────────────
// 🔹 TYPES
// ──────────────────────────────────────────────────────────────────────────

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 API SERVICE
// ──────────────────────────────────────────────────────────────────────────

export const userApi = {
  /**
   * Récupère la liste des utilisateurs (admin uniquement)
   * Retourne directement un tableau User[]
   */
  getUsers: async (params?: UserQueryParams): Promise<User[]> => {
    const { data } = await api.get('/users', { params });
    
    // ✅ Extraction flexible selon le format de réponse backend
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.users)) return data.users;
    // ✅ Format Bokoma : { success, data: { users: [...], pagination: {...} } }
    if (Array.isArray(data?.data?.users)) return data.data.users;

    return [];
  },

  /**
   * Récupère un utilisateur par son ID
   */
  getUserById: async (userId: string): Promise<User> => {
    const { data } = await api.get(`/users/${userId}`);
    return data?.user || data?.data || (data as User);
  },

  /**
   * Met à jour un utilisateur (rôle, profil, etc.)
   */
  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    const { data } = await api.patch(`/users/${userId}`, updates);
    return data?.user || data?.data || (data as User);
  },

  /**
   * Active ou désactive un compte utilisateur
   */
  toggleUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const { data } = await api.patch(`/users/${userId}/status`, { isActive });
    return data?.user || data?.data || (data as User);
  },

  /**
   * Supprime un utilisateur
   */
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  }
};