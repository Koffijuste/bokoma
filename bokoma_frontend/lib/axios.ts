// src/lib/axios.ts
import axios from 'axios';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '@/constants';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ✅ Important si cookies cross-origin
});

// ───────── INTERCEPTOR REQUÊTE ─────────
api.interceptors.request.use(
  (config) => {
    if (typeof window === 'undefined') return config; // ✅ SSR safe

    // 🔹 Priorité 1: Cookie (plus fiable pour les requêtes auto)
    let token = Cookies.get(STORAGE_KEYS.AUTH_TOKEN);
    
    // 🔹 Priorité 2: localStorage (fallback si cookie expiré/non lu)
    if (!token) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed.accessToken || parsed;
        }
      } catch {}
    }

    // 🔹 Injection du token au format Bearer
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ───────── INTERCEPTOR RÉPONSE ─────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ Propage l'erreur complète pour le frontend
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Optionnel: déclencher une déconnexion auto
      // window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;