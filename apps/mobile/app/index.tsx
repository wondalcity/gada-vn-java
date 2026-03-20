import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/auth.store';
import auth from '@react-native-firebase/auth';
import { syncAuthToken } from '../lib/firebase';

export default function Index() {
  const { isAuthenticated, isLoading, role, setUser, clearUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const result = await syncAuthToken();
          if (result) {
            const user = result.user as { id: string; role: 'WORKER' | 'MANAGER' };
            setUser(user.id, user.role);
          }
        } catch {
          clearUser();
        }
      } else {
        clearUser();
      }
    });
    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B2C" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/phone" />;
  if (role === 'MANAGER') return <Redirect href="/(manager)" />;
  return <Redirect href="/(worker)" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
