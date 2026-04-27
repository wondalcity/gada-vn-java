import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export const PERMISSIONS_DONE_KEY = '@gada_permissions_done';

export default function Index() {
  const { isAuthenticated, isLoading, role } = useAuthStore();
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [permissionsDone, setPermissionsDone] = useState(false);
  const splashHidden = useRef(false);
  const navigated = useRef(false);
  const router = useRouter();

  // AsyncStorage에서 권한 요청 여부 확인
  useEffect(() => {
    AsyncStorage.getItem(PERMISSIONS_DONE_KEY)
      .then((val) => {
        setPermissionsDone(val === '1');
        setPermissionsChecked(true);
      })
      .catch(() => setPermissionsChecked(true));
  }, []);

  // auth + permissions 둘 다 확인된 순간 스플래시 제거 후 라우팅
  useEffect(() => {
    if (isLoading || !permissionsChecked) return;
    if (navigated.current) return;
    navigated.current = true;

    // 스플래시 제거
    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }

    // 적절한 화면으로 이동
    if (!permissionsDone) {
      router.replace('/(permissions)');
    } else if (!isAuthenticated) {
      router.replace('/(auth)/phone');
    } else if (role === 'MANAGER') {
      router.replace('/(manager)/home');
    } else {
      router.replace('/(worker)');
    }
  }, [isLoading, permissionsChecked, permissionsDone, isAuthenticated, role, router]);

  // 로딩 중 → 스플래시가 계속 덮고 있으므로 빈 화면 반환
  return <View style={styles.blank} />;
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: '#FFFFFF' },
});
