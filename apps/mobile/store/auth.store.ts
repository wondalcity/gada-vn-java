import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  userId: string | null;
  role: 'WORKER' | 'MANAGER' | null;
  isManager: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNew: boolean;
  pendingName: string | null;
  pendingPhone: string | null;     // server OTP flow (staging / test phone)
  confirmationResult: FirebaseAuthTypes.ConfirmationResult | null; // Firebase Phone Auth flow (production / normal phone)
  devOtp: string | null;           // OTP returned in staging response (auto-fill)
  setUser: (userId: string, role: 'WORKER' | 'MANAGER', isManager?: boolean) => void;
  setNew: (isNew: boolean) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setPendingName: (name: string) => void;
  clearPendingName: () => void;
  setPendingPhone: (phone: string) => void;
  clearPendingPhone: () => void;
  setConfirmationResult: (result: FirebaseAuthTypes.ConfirmationResult | null) => void;
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
  confirmationResult: null,
  devOtp: null,
  setUser: (userId, role, isManager) =>
    set({ userId, role, isManager: isManager ?? role === 'MANAGER', isAuthenticated: true, isLoading: false }),
  setNew: (isNew) => set({ isNew }),
  clearUser: () =>
    set({
      userId: null, role: null, isManager: false,
      isAuthenticated: false, isLoading: false, isNew: false,
      pendingName: null, pendingPhone: null, confirmationResult: null, devOtp: null,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setPendingName: (pendingName) => set({ pendingName }),
  clearPendingName: () => set({ pendingName: null }),
  setPendingPhone: (pendingPhone) => set({ pendingPhone }),
  clearPendingPhone: () => set({ pendingPhone: null }),
  setConfirmationResult: (confirmationResult) => set({ confirmationResult }),
  setDevOtp: (devOtp) => set({ devOtp }),
}));
