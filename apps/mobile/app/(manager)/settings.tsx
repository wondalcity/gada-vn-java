import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LANGUAGES, changeAppLanguage, LangCode } from '../../lib/i18n';
import { signOut } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';

export default function ManagerSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearUser } = useAuthStore();
  const [langModalVisible, setLangModalVisible] = useState(false);

  async function handleLogout() {
    Alert.alert(t('worker.logout_confirm_title'), t('worker.logout_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('worker.logout'), style: 'destructive',
        onPress: async () => { await signOut(); clearUser(); router.replace('/(auth)/phone'); },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      {/* Language setting */}
      <TouchableOpacity style={styles.row} onPress={() => setLangModalVisible(true)} activeOpacity={0.7}>
        <Text style={styles.rowIcon}>🌐</Text>
        <Text style={styles.rowLabel}>{t('profile.language')}</Text>
        <Text style={styles.rowValue}>
          {SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.flag ?? '🌐'} ›
        </Text>
      </TouchableOpacity>

      {/* Customer support phone */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => Linking.openURL('tel:+84568240240')}
        activeOpacity={0.7}
      >
        <Text style={styles.rowIcon}>📞</Text>
        <Text style={styles.rowLabel}>{t('profile.support_phone')}</Text>
        <Text style={styles.rowValue}>{t('profile.support_phone_number')} ›</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>{t('worker.logout')}</Text>
      </TouchableOpacity>

      {/* Language modal */}
      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setLangModalVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('profile.language')}</Text>
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
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginBottom: 1,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  rowIcon: { fontSize: 20, marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#25282A' },
  rowValue: { fontSize: 14, color: '#98A2B2' },
  logoutBtn: {
    margin: 24, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#FF6B2C', alignItems: 'center',
  },
  logoutText: { color: '#FF6B2C', fontSize: 16, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#25282A', marginBottom: 16, textAlign: 'center' },
  langOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 8, backgroundColor: '#F9FAFB',
  },
  langOptionActive: { backgroundColor: '#FFF3EE', borderWidth: 1.5, borderColor: '#FF6B2C' },
  langFlag: { fontSize: 22, marginRight: 12 },
  langLabel: { fontSize: 15, fontWeight: '600', color: '#25282A', flex: 1 },
  langLabelActive: { color: '#FF6B2C' },
  langCheck: { fontSize: 16, color: '#FF6B2C', fontWeight: '700' },
});
