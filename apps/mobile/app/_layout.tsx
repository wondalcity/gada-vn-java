import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import * as SplashScreen from 'expo-splash-screen';
import auth from '@react-native-firebase/auth';
import i18n, { getSavedLanguage } from '../lib/i18n';
import { syncAuthToken } from '../lib/firebase';
import { api } from '../lib/api-client';
import { useAuthStore } from '../store/auth.store';
import { Colors } from '../constants/theme';
import { initCrashlytics, setAuthUser, clearAuthUser, logEvent } from '../lib/crashlytics';

// 스플래시를 앱 초기화 완료 전까지 유지
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { t } = useTranslation();
  const { setUser, setNew, clearUser } = useAuthStore();
  const router = useRouter();
  const authInitialized = useRef(false);

  // Crashlytics 초기화
  useEffect(() => {
    initCrashlytics();
  }, []);

  // i18n 언어 복원 (비동기, 스플래시와 무관)
  useEffect(() => {
    getSavedLanguage().then((lang) => {
      if (lang && lang !== i18n.language) i18n.changeLanguage(lang);
    }).catch(() => {});
  }, []);

  // Firebase 인증 상태 구독 — 루트 레이아웃에서 관리해야 언마운트되지 않음
  useEffect(() => {
    const timeout = setTimeout(() => clearUser(), 3000);

    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      clearTimeout(timeout);
      const isFirstCheck = !authInitialized.current;
      authInitialized.current = true;

      if (firebaseUser) {
        logEvent(`Auth: Firebase user detected uid=${firebaseUser.uid}`);
        try {
          const result = await syncAuthToken();
          if (result) {
            const user = result.user as {
              id: string;
              isManager?: boolean;
              isWorker?: boolean;
              roles?: string[];
            };
            const role = user.isManager ? 'MANAGER' : 'WORKER';
            setUser(user.id, role as 'WORKER' | 'MANAGER', user.isManager ?? false);
            await setAuthUser(user.id, role as 'WORKER' | 'MANAGER');

            // OTP 확인 후 명시적 라우팅 (첫 번째 체크는 index.tsx가 처리)
            if (!isFirstCheck) {
              if (result.isNew) {
                logEvent('Auth: new user registration');
                // 신규 가입: 회원가입 화면에서 입력한 이름이 있으면 저장
                const { pendingName } = useAuthStore.getState();
                if (pendingName) {
                  try {
                    await api.post('/auth/register', { name: pendingName });
                  } catch { /* 이름 저장 실패는 무시 — 프로필에서 나중에 설정 가능 */ }
                  useAuthStore.getState().clearPendingName();
                }
                router.replace('/(worker)');
              } else if (role === 'MANAGER') {
                logEvent('Auth: existing MANAGER navigating to manager home');
                router.replace('/(manager)');
              } else {
                logEvent('Auth: existing WORKER navigating to worker home');
                router.replace('/(worker)');
              }
            }
          } else {
            await clearAuthUser();
            clearUser();
            if (!isFirstCheck) router.replace('/(auth)/phone');
          }
        } catch (e) {
          logEvent(`Auth: syncAuthToken failed — ${e instanceof Error ? e.message : String(e)}`);
          await clearAuthUser();
          clearUser();
          if (!isFirstCheck) router.replace('/(auth)/phone');
        }
      } else {
        logEvent('Auth: no Firebase user (signed out)');
        await clearAuthUser();
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
