// services/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 10000,
  // ❌ NE PAS définir Content-Type par défaut
  // headers: { 'Content-Type': 'application/json' },
});

// 🔐 Intercepteur pour ajouter automatiquement le token d'accès
apiClient.interceptors.request.use((config) => {
  // ✅ Définir Content-Type UNIQUEMENT pour les données non-FormData
  if (config.data instanceof FormData) {
    // Forcer undefined pour laisser le navigateur gérer
    config.headers['Content-Type'] = undefined;
  } else if (config.data && typeof config.data === 'object') {
    config.headers['Content-Type'] = 'application/json';
  }
  
  // Récupérer le token depuis localStorage
  let token: string | null = null;
  
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('bokoma-auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed?.state?.accessToken || null;
      }
      if (!token) {
        const auth = localStorage.getItem('auth');
        if (auth) {
          const authState = JSON.parse(auth);
          token = authState?.accessToken || null;
        }
      }
    } catch {
      token = null;
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Intercepteur pour gérer les timeouts et 401
apiClient.interceptors.response.use(
  res => res,
  error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('⏱️ Délai de réponse dépassé'));
    }
    if (error.response?.status === 401) {
      console.warn('⚠️ Token invalide ou expiré');
    }
    return Promise.reject(error);
  }
);