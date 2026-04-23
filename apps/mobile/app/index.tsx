import { useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/auth.store';
import auth from '@react-native-firebase/auth';
import { syncAuthToken } from '../lib/firebase';

export const PERMISSIONS_DONE_KEY = '@gada_permissions_done';

export default function Index() {
  const { isAuthenticated, isLoading, role, isNew, setUser, setNew, clearUser } = useAuthStore();
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [permissionsDone, setPermissionsDone] = useState(false);
  const splashHidden = useRef(false);

  // 1) AsyncStorage에서 권한 요청 여부 확인
  useEffect(() => {
    AsyncStorage.getItem(PERMISSIONS_DONE_KEY)
      .then((val) => {
        setPermissionsDone(val === '1');
        setPermissionsChecked(true);
      })
      .catch(() => setPermissionsChecked(true));
  }, []);

  // 2) Firebase 인증 상태 구독
  useEffect(() => {
    const timeout = setTimeout(() => clearUser(), 10000);

    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      clearTimeout(timeout);
      if (firebaseUser) {
        try {
          const result = await syncAuthToken();
          if (result) {
            const user = result.user as { id: string; role: 'WORKER' | 'MANAGER'; isManager?: boolean };
            setUser(user.id, user.role, user.isManager);
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

  // 3) auth + permissions 둘 다 확인된 순간 스플래시 제거
  useEffect(() => {
    if (!isLoading && permissionsChecked && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, permissionsChecked]);

  // 로딩 중 → 스플래시가 계속 덮고 있으므로 빈 화면 반환
  if (isLoading || !permissionsChecked) {
    return <View style={styles.blank} />;
  }

  // 최초 실행 → 권한 요청 화면
  if (!permissionsDone) {
    return <Redirect href="/(permissions)" />;
  }

  // 미로그인 → 전화번호 입력 화면
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/phone" />;
  }

  // 신규 가입 → 역할 선택
  if (isNew) return <Redirect href="/(auth)/role" />;

  // 역할에 따라 홈 화면 진입
  if (role === 'MANAGER') return <Redirect href="/(manager)" />;
  return <Redirect href="/(worker)" />;
}

const styles = StyleSheet.create({
  // 스플래시와 동일한 오렌지 배경으로 깜빡임 방지
  blank: { flex: 1, backgroundColor: '#FF6B2C' },
});
