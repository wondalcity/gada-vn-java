import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { signOut } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';

export default function WorkerProfile() {
  const { t } = useTranslation();
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
        <Text style={styles.name}>근로자</Text>
      </View>

      {[
        { label: t('profile.experience'), icon: '🔨' },
        { label: t('profile.id_verification'), icon: '🪪' },
        { label: t('profile.signature'), icon: '✍️' },
        { label: t('profile.bank_info'), icon: '🏦' },
      ].map((item) => (
        <TouchableOpacity key={item.label} style={styles.row}>
          <Text style={styles.rowIcon}>{item.icon}</Text>
          <Text style={styles.rowLabel}>{item.label}</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.divider} />

      {[
        { label: t('profile.push_notifications'), icon: '🔔' },
        { label: t('profile.language'), icon: '🌐' },
        { label: t('profile.terms'), icon: '📄' },
        { label: t('profile.privacy'), icon: '🔒' },
      ].map((item) => (
        <TouchableOpacity key={item.label} style={styles.row}>
          <Text style={styles.rowIcon}>{item.icon}</Text>
          <Text style={styles.rowLabel}>{item.label}</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#fff', alignItems: 'center', padding: 32, marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFD4C0', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderColor: '#eee',
  },
  rowIcon: { fontSize: 20, marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  rowArrow: { fontSize: 20, color: '#ccc' },
  divider: { height: 8, backgroundColor: '#F5F5F5' },
  logoutBtn: { margin: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B2C', alignItems: 'center' },
  logoutText: { color: '#FF6B2C', fontSize: 16, fontWeight: '600' },
});
