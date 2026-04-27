import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  role: 'WORKER' | 'MANAGER' | null;
  isManager: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNew: boolean;
  pendingName: string | null; // name collected during signup, cleared after /auth/register
  pendingPhone: string | null; // phone number being verified via server OTP
  setUser: (userId: string, role: 'WORKER' | 'MANAGER', isManager?: boolean) => void;
  setNew: (isNew: boolean) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setPendingName: (name: string) => void;
  clearPendingName: () => void;
  setPendingPhone: (phone: string) => void;
  clearPendingPhone: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  isManager: false,
  isAuthenticated: false,
  isLoading: true,
  isNew: false,
  pendingName: null,
  pendingPhone: null,
  setUser: (userId, role, isManager) =>
    set({ userId, role, isManager: isManager ?? role === 'MANAGER', isAuthenticated: true, isLoading: false }),
  setNew: (isNew) => set({ isNew }),
  clearUser: () =>
    set({ userId: null, role: null, isManager: false, isAuthenticated: false, isLoading: false, isNew: false, pendingName: null, pendingPhone: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setPendingName: (pendingName) => set({ pendingName }),
  clearPendingName: () => set({ pendingName: null }),
  setPendingPhone: (pendingPhone) => set({ pendingPhone }),
  clearPendingPhone: () => set({ pendingPhone: null }),
}));
