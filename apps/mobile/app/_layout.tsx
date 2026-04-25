import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
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
  const router = useRouter();
  // 첫 번째 onAuthStateChanged 이벤트는 앱 초기화; 이후 이벤트는 로그인/로그아웃 액션
  const authInitialized = useRef(false);

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
      const isFirstCheck = !authInitialized.current;
      authInitialized.current = true;

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

            // OTP 확인 후 명시적 라우팅 (첫 번째 체크는 index.tsx가 Redirect로 처리)
            if (!isFirstCheck) {
              if (result.isNew) {
                router.replace('/(auth)/role');
              } else if (role === 'MANAGER') {
                router.replace('/(manager)');
              } else {
                router.replace('/(worker)');
              }
            }
          } else {
            clearUser();
            if (!isFirstCheck) router.replace('/(auth)/phone');
          }
        } catch {
          clearUser();
          if (!isFirstCheck) router.replace('/(auth)/phone');
        }
      } else {
        clearUser();
        // 첫 번째 체크에서는 라우팅 안 함 — index.tsx가 처리
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
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.onSurface,
          headerTitleStyle: { fontWeight: '600' },
          headerBackTitle: '',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(permissions)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(worker)" options={{ headerShown: false }} />
        <Stack.Screen name="(manager)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
