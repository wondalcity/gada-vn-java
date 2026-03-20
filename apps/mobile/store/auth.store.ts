import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  role: 'WORKER' | 'MANAGER' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNew: boolean; // true when backend returned isNew=true (needs role selection)
  setUser: (userId: string, role: 'WORKER' | 'MANAGER') => void;
  setNew: (isNew: boolean) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  isNew: false,
  setUser: (userId, role) =>
    set({ userId, role, isAuthenticated: true, isLoading: false }),
  setNew: (isNew) => set({ isNew }),
  clearUser: () =>
    set({ userId: null, role: null, isAuthenticated: false, isLoading: false, isNew: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
