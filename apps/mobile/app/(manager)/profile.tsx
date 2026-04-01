import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signOut } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import i18n, { SUPPORTED_LANGUAGES, changeAppLanguage, LangCode } from '../../lib/i18n';

export default function ManagerProfile() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearUser } = useAuthStore();
  const [langModalVisible, setLangModalVisible] = useState(false);

  async function handleLogout() {
    await signOut();
    clearUser();
    router.replace('/(auth)/phone');
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.name}>{t('manager.admin_label')}</Text>
      </View>

      {/* Language setting */}
      <TouchableOpacity style={styles.settingRow} onPress={() => setLangModalVisible(true)} activeOpacity={0.7}>
        <Text style={styles.settingIcon}>🌐</Text>
        <Text style={styles.settingLabel}>{t('profile.language')}</Text>
        <Text style={styles.settingValue}>
          {SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.flag ?? '🌐'} ›
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>

      {/* Language selection modal */}
      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLangModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('profile.language')}</Text>
            {SUPPORTED_LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langOption, i18n.language === lang.code && styles.langOptionActive]}
                onPress={async () => {
                  await changeAppLanguage(lang.code as LangCode);
                  setLangModalVisible(false);
                }}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, i18n.language === lang.code && styles.langLabelActive]}>{lang.label}</Text>
                {i18n.language === lang.code && <Text style={styles.langCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#fff', alignItems: 'center', padding: 32, marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFD4C0', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 0, marginBottom: 1, paddingHorizontal: 20, paddingVertical: 16 },
  settingIcon: { fontSize: 20, marginRight: 12 },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#25282A' },
  settingValue: { fontSize: 14, color: '#98A2B2' },
  logoutBtn: { margin: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B2C', alignItems: 'center' },
  logoutText: { color: '#FF6B2C', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#25282A', marginBottom: 16, textAlign: 'center' },
  langOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F9FAFB' },
  langOptionActive: { backgroundColor: '#FFF3EE', borderWidth: 1.5, borderColor: '#FF6B2C' },
  langFlag: { fontSize: 22, marginRight: 12 },
  langLabel: { fontSize: 15, fontWeight: '600', color: '#25282A', flex: 1 },
  langLabelActive: { color: '#FF6B2C' },
  langCheck: { fontSize: 16, color: '#FF6B2C', fontWeight: '700' },
});
