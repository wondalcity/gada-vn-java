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
  devOtp: string | null;        // OTP code returned by server in staging (devOtp field)
  setUser: (userId: string, role: 'WORKER' | 'MANAGER', isManager?: boolean) => void;
  setNew: (isNew: boolean) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setPendingName: (name: string) => void;
  clearPendingName: () => void;
  setPendingPhone: (phone: string) => void;
  clearPendingPhone: () => void;
  setDevOtp: (otp: string | null) => void;
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
  devOtp: null,
  setUser: (userId, role, isManager) =>
    set({ userId, role, isManager: isManager ?? role === 'MANAGER', isAuthenticated: true, isLoading: false }),
  setNew: (isNew) => set({ isNew }),
  clearUser: () =>
    set({ userId: null, role: null, isManager: false, isAuthenticated: false, isLoading: false, isNew: false, pendingName: null, pendingPhone: null, devOtp: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setPendingName: (pendingName) => set({ pendingName }),
  clearPendingName: () => set({ pendingName: null }),
  setPendingPhone: (pendingPhone) => set({ pendingPhone }),
  clearPendingPhone: () => set({ pendingPhone: null }),
  setDevOtp: (devOtp) => set({ devOtp }),
}));
