import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Alert, Linking, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LANGUAGES, changeAppLanguage, LangCode } from '../../lib/i18n';
import { signOut } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';

export default function WorkerSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearUser } = useAuthStore();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

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
      {/* Section: 알림 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t('profile.section_notifications', '알림')}</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>🔔</Text>
          <Text style={styles.rowLabel}>{t('profile.push_notifications', '푸시 수신 여부')}</Text>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
            thumbColor={pushEnabled ? '#0669F7' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Section: 언어 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t('profile.section_language', '언어')}</Text>
      </View>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => setLangModalVisible(true)} activeOpacity={0.7}>
          <Text style={styles.rowIcon}>🌐</Text>
          <Text style={styles.rowLabel}>{t('profile.language', '언어 설정')}</Text>
          <Text style={styles.rowValue}>
            {SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.flag ?? '🌐'} ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section: 약관/정책 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t('profile.section_legal', '약관 및 정책')}</Text>
      </View>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} activeOpacity={0.7}>
          <Text style={styles.rowIcon}>📄</Text>
          <Text style={styles.rowLabel}>{t('profile.terms', '이용약관')}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} activeOpacity={0.7}>
          <Text style={styles.rowIcon}>🔒</Text>
          <Text style={styles.rowLabel}>{t('profile.privacy', '개인정보보호방침')}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Section: 고객지원 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t('profile.section_support', '고객지원')}</Text>
      </View>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL('tel:+84568240240')}
          activeOpacity={0.7}
        >
          <Text style={styles.rowIcon}>📞</Text>
          <Text style={styles.rowLabel}>{t('profile.support_phone', '고객센터')}</Text>
          <Text style={styles.rowValue}>{t('profile.support_phone_number', '+84 56 824 0240')} ›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>{t('worker.logout', '로그아웃')}</Text>
      </TouchableOpacity>

      {/* Language modal */}
      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setLangModalVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('profile.language', '언어 설정')}</Text>
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
  sectionHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#98A2B2', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  rowIcon: { fontSize: 18, marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#25282A' },
  rowValue: { fontSize: 13, color: '#98A2B2' },
  rowChevron: { fontSize: 16, color: '#C0C4CF' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 46 },
  logoutBtn: {
    margin: 24, marginTop: 32, padding: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#0669F7', alignItems: 'center',
  },
  logoutText: { color: '#0669F7', fontSize: 15, fontWeight: '700' },
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
  langOptionActive: { backgroundColor: '#EFF5FF', borderWidth: 1.5, borderColor: '#0669F7' },
  langFlag: { fontSize: 22, marginRight: 12 },
  langLabel: { fontSize: 15, fontWeight: '600', color: '#25282A', flex: 1 },
  langLabelActive: { color: '#0669F7' },
  langCheck: { fontSize: 16, color: '#0669F7', fontWeight: '700' },
});
