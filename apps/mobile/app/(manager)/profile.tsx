import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';

export default function ManagerProfile() {
  const router = useRouter();
  const { clearUser } = useAuthStore();

  async function handleLogout() {
    await signOut();
    clearUser();
    router.replace('/(auth)/phone');
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.name}>관리자</Text>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#fff', alignItems: 'center', padding: 32, marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFD4C0', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '700' },
  logoutBtn: { margin: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B2C', alignItems: 'center' },
  logoutText: { color: '#FF6B2C', fontSize: 16, fontWeight: '600' },
});
