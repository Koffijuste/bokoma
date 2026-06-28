// store/ui.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// ✅ Storage SSR-safe : no-op côté serveur, localStorage côté client
const ssrSafeStorage = createJSONStorage(() => {
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return localStorage;
});

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      theme: 'light',

      toggleSidebar:  () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleTheme:    () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setTheme:       (theme) => set({ theme }),
    }),
    {
      name: 'bokoma-ui',
      storage: ssrSafeStorage,
      // Ne pas persister sidebarOpen — toujours fermé au chargement
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);