import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  role: 'WORKER' | 'MANAGER' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (userId: string, role: 'WORKER' | 'MANAGER') => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (userId, role) => set({ userId, role, isAuthenticated: true, isLoading: false }),
  clearUser: () => set({ userId: null, role: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
