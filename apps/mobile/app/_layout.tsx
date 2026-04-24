import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import * as SplashScreen from 'expo-splash-screen';
import auth from '@react-native-firebase/auth';
import i18n, { getSavedLanguage } from '../lib/i18n';
import { syncAuthToken } from '../lib/firebase';
import { useAuthStore } from '../store/auth.store';
import { Colors } from '../constants/theme';

// 스플래시를 앱 초기화 완료 전까지 유지
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { t } = useTranslation();
  const { setUser, setNew, clearUser } = useAuthStore();

  // i18n 언어 복원 (비동기, 스플래시와 무관)
  useEffect(() => {
    getSavedLanguage().then((lang) => {
      if (lang && lang !== i18n.language) i18n.changeLanguage(lang);
    }).catch(() => {});
  }, []);

  // Firebase 인증 상태 구독 — 루트 레이아웃에서 관리해야 언마운트되지 않음
  useEffect(() => {
    const timeout = setTimeout(() => clearUser(), 10000);

    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      clearTimeout(timeout);
      if (firebaseUser) {
        try {
          const result = await syncAuthToken();
          if (result) {
            const user = result.user as {
              id: string;
              isManager?: boolean;
              isWorker?: boolean;
              roles?: string[];
            };
            // API returns isManager boolean; derive role string from it
            const role = user.isManager ? 'MANAGER' : 'WORKER';
            setUser(user.id, role as 'WORKER' | 'MANAGER', user.isManager ?? false);
            if (result.isNew) setNew(true);
          } else {
            clearUser();
          }
        } catch {
          clearUser();
        }
      } else {
        clearUser();
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(permissions)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/role" options={{ title: t('auth.role_select_title'), headerShown: true }} />
        <Stack.Screen name="(worker)" options={{ headerShown: false }} />
        <Stack.Screen name="(manager)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
