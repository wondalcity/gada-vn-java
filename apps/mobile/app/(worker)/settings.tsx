import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Alert, Linking, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import i18n, { SUPPORTED_LANGUAGES, changeAppLanguage, LangCode } from '../../lib/i18n';
import { signOut } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { showToast } from '../../lib/toast';
import { Colors, Radius } from '../../constants/theme';

export default function WorkerSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearUser } = useAuthStore();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermStatus, setPushPermStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [pushModalVisible, setPushModalVisible] = useState(false);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      const s = status as string;
      if (s === 'granted') { setPushEnabled(true); setPushPermStatus('granted'); }
      else if (s === 'denied') { setPushEnabled(false); setPushPermStatus('denied'); }
      else { setPushEnabled(false); setPushPermStatus('undetermined'); }
    }).catch(() => {});
  }, []);

  async function handlePushToggle(value: boolean) {
    if (!value) {
      // Turning off — just update local state; real revocation requires OS settings
      setPushEnabled(false);
      showToast({ message: t('profile.push_disabled', '기기 설정에서 알림을 끌 수 있습니다'), type: 'info' });
      return;
    }

    if (pushPermStatus === 'denied') {
      // Already denied — must open device settings
      setPushModalVisible(true);
      return;
    }

    if (pushPermStatus === 'granted') {
      setPushEnabled(true);
      return;
    }

    // undetermined — request permission
    setPushModalVisible(true);
  }

  async function requestPermission() {
    setPushModalVisible(false);
    if (pushPermStatus === 'denied') {
      Linking.openSettings();
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setPushEnabled(true);
      setPushPermStatus('granted');
      showToast({ message: t('profile.push_enabled', '푸시 알림이 허용되었습니다'), type: 'success' });
    } else {
      setPushEnabled(false);
      setPushPermStatus('denied');
      showToast({ message: t('profile.push_denied', '푸시 알림이 거부되었습니다'), type: 'error' });
    }
  }

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
        <TouchableOpacity
          style={styles.row}
          onPress={() => handlePushToggle(!pushEnabled)}
          activeOpacity={0.7}
        >
          <Text style={styles.rowIcon}>🔔</Text>
          <Text style={styles.rowLabel}>{t('profile.push_notifications', '푸시 수신 여부')}</Text>
          <Switch
            value={pushEnabled}
            onValueChange={handlePushToggle}
            trackColor={{ false: Colors.outline, true: Colors.primaryContainer }}
            thumbColor={pushEnabled ? Colors.primary : Colors.disabled}
          />
        </TouchableOpacity>
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
        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => Linking.openURL('http://54.255.223.214:3000/terms/vi')}>
          <Text style={styles.rowIcon}>📄</Text>
          <Text style={styles.rowLabel}>{t('profile.terms', '이용약관')}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => Linking.openURL('http://54.255.223.214:3000/policy/vi')}>
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

      {/* Push notification permission modal */}
      <Modal visible={pushModalVisible} transparent animationType="fade" onRequestClose={() => setPushModalVisible(false)}>
        <View style={styles.permOverlay}>
          <View style={styles.permModal}>
            <View style={styles.permIconWrap}>
              <Text style={styles.permIcon}>🔔</Text>
            </View>
            <Text style={styles.permTitle}>
              {pushPermStatus === 'denied'
                ? t('profile.push_perm_denied_title', '알림 권한 없음')
                : t('profile.push_perm_title', '푸시 알림 허용')}
            </Text>
            <Text style={styles.permBody}>
              {pushPermStatus === 'denied'
                ? t('profile.push_perm_denied_body', '기기 설정에서 가다 VN의 알림을 허용해 주세요.\n채용 알림, 계약서 서명 요청 등을 받을 수 있습니다.')
                : t('profile.push_perm_body', '가다 VN에서 보내는 채용 알림, 계약서 서명 요청, 공지 등을 받으려면 알림 권한이 필요합니다.')}
            </Text>
            <TouchableOpacity style={styles.permAllowBtn} onPress={requestPermission} activeOpacity={0.8}>
              <Text style={styles.permAllowText}>
                {pushPermStatus === 'denied'
                  ? t('profile.push_perm_open_settings', '설정 열기')
                  : t('profile.push_perm_allow', '허용하기')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permCancelBtn} onPress={() => setPushModalVisible(false)} activeOpacity={0.8}>
              <Text style={styles.permCancelText}>{t('common.cancel', '취소')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center',
  },
  logoutText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },

  // Language modal
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
  langOptionActive: { backgroundColor: '#EFF5FF', borderWidth: 1.5, borderColor: Colors.primary },
  langFlag: { fontSize: 22, marginRight: 12 },
  langLabel: { fontSize: 15, fontWeight: '600', color: '#25282A', flex: 1 },
  langLabelActive: { color: Colors.primary },
  langCheck: { fontSize: 16, color: Colors.primary, fontWeight: '700' },

  // Push permission modal
  permOverlay: {
    flex: 1, backgroundColor: Colors.overlay80,
    justifyContent: 'center', alignItems: 'center',
    padding: 24,
  },
  permModal: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  permIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  permIcon: { fontSize: 30 },
  permTitle: { fontSize: 18, fontWeight: '800', color: Colors.onSurface, marginBottom: 10, textAlign: 'center' },
  permBody: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permAllowBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, paddingHorizontal: 32,
    alignSelf: 'stretch', alignItems: 'center', marginBottom: 10,
  },
  permAllowText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '700' },
  permCancelBtn: {
    paddingVertical: 10, alignSelf: 'stretch', alignItems: 'center',
  },
  permCancelText: { color: Colors.onSurfaceVariant, fontSize: 14, fontWeight: '500' },
});
