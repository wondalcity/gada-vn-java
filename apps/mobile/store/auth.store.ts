import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  userId: string | null;
  role: 'WORKER' | 'MANAGER' | null;
  isManager: boolean; // true when role=MANAGER OR managerStatus=approved
  isAuthenticated: boolean;
  isLoading: boolean;
  isNew: boolean; // true when backend returned isNew=true (needs role selection)
  confirmationResult: FirebaseAuthTypes.ConfirmationResult | null;
  setUser: (userId: string, role: 'WORKER' | 'MANAGER', isManager?: boolean) => void;
  setNew: (isNew: boolean) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setConfirmationResult: (result: FirebaseAuthTypes.ConfirmationResult | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  isManager: false,
  isAuthenticated: false,
  isLoading: true,
  isNew: false,
  confirmationResult: null,
  setUser: (userId, role, isManager) =>
    set({ userId, role, isManager: isManager ?? role === 'MANAGER', isAuthenticated: true, isLoading: false }),
  setNew: (isNew) => set({ isNew }),
  clearUser: () =>
    set({ userId: null, role: null, isManager: false, isAuthenticated: false, isLoading: false, isNew: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setConfirmationResult: (confirmationResult) => set({ confirmationResult }),
}));
