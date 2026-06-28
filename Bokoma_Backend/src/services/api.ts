// services/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // ✅ Envoie automatiquement les cookies httpOnly
  timeout: 10000,
});

// ─── Intercepteur requête ─────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  // FormData : laisser le navigateur gérer le Content-Type (boundary multipart)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (config.data !== undefined) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// ─── Intercepteur réponse ─────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(undefined)
  );
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Délai de réponse dépassé'));
    }

    // ─── Refresh token automatique sur 401 ───────────────────────────────────
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // File d'attente pendant le refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(original))
          .catch((e) => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Le cookie bokoma_refresh_token est envoyé automatiquement (withCredentials)
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(original); // Retry la requête originale
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh échoué → déconnexion
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);