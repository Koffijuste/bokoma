// Backend - services/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Pour envoyer les cookies (refreshToken)
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 🔐 Intercepteur pour ajouter automatiquement le token d'accès
apiClient.interceptors.request.use((config) => {
  // Récupérer le token depuis le store Zustand ou localStorage
  let token: string | null = null;
  
  // Option A: Si vous utilisez un store Zustand pour l'auth
  if (typeof window !== 'undefined') {
    try {
      const authState = JSON.parse(localStorage.getItem('auth') || '{}');
      token = authState?.accessToken || null;
    } catch {
      token = null;
    }
  }
  
  // Option B: Si vous avez une fonction pour récupérer le token
  // token = getAuthToken(); 
  
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
      // Optionnel: Déconnecter l'utilisateur ou rafraîchir le token
      console.warn('⚠️ Token invalide ou expiré');
      // logout(); // Si vous avez une fonction de déconnexion
    }
    return Promise.reject(error);
  }
);