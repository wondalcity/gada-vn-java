import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { api, ApiError } from '../../lib/api-client';
import { Colors, Radius, Spacing, Font } from '../../constants/theme';
import { showToast } from '../../lib/toast';

type Role = 'WORKER' | 'MANAGER';

const ROLE_OPTIONS: { role: Role; icon: string; titleKey: string; descKey: string }[] = [
  { role: 'WORKER', icon: '👷', titleKey: 'auth.role_worker', descKey: 'auth.role_worker_desc' },
  { role: 'MANAGER', icon: '🏗️', titleKey: 'auth.role_manager', descKey: 'auth.role_manager_desc' },
];

export default function RoleSelectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userId, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  const canConfirm = !!selected && name.trim().length >= 2;

  async function handleConfirm() {
    if (!canConfirm || !userId) return;
    setLoading(true);
    try {
      await api.post('/auth/register', { name: name.trim(), role: selected });
      setUser(userId, selected!);
      if (selected === 'MANAGER') {
        router.replace('/(manager)/register');
      } else {
        router.replace('/(worker)/');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('auth.role_register_fail', '역할 등록에 실패했습니다');
      showToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('auth.role_select_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.role_select_subtitle')}</Text>

          {/* Name input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('auth.name_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.name_placeholder')}
              placeholderTextColor={Colors.disabled}
              value={name}
              onChangeText={setName}
              autoCorrect={false}
              maxLength={50}
              returnKeyType="done"
            />
          </View>

          {/* Role options */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('auth.role_label')}</Text>
            <View style={styles.options}>
              {ROLE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.role}
                  style={[styles.option, selected === opt.role && styles.optionSelected]}
                  onPress={() => setSelected(opt.role)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionIcon}>{opt.icon}</Text>
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionTitle, selected === opt.role && styles.optionTitleSelected]}>
                      {opt.role === 'WORKER' ? t('auth.role_worker') : t('auth.role_manager')}
                    </Text>
                    <Text style={[styles.optionDesc, selected === opt.role && styles.optionDescSelected]}>
                      {opt.role === 'WORKER' ? t('auth.role_worker_desc') : t('auth.role_manager_desc')}
                    </Text>
                  </View>
                  <View style={[styles.radio, selected === opt.role && styles.radioSelected]}>
                    {selected === opt.role && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {selected === 'MANAGER' && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{t('auth.manager_notice')}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (!canConfirm || loading) && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{t('auth.start')}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.xxl, paddingTop: Spacing.xl, gap: Spacing.xl },

  title: { ...Font.h3, color: Colors.onSurface, textAlign: 'center' },
  subtitle: { ...Font.body3, color: Colors.onSurfaceVariant, textAlign: 'center' },

  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { ...Font.t4, color: Colors.onSurface },

  input: {
    borderWidth: 1.5, borderColor: Colors.outline, borderRadius: Radius.md,
    padding: Spacing.lg, ...Font.body1, color: Colors.onSurface,
  },

  options: { gap: Spacing.md },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 2, borderColor: Colors.outline, borderRadius: Radius.lg,
    padding: 20, backgroundColor: Colors.surfaceDim,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  optionIcon: { fontSize: 36, width: 48, textAlign: 'center' },
  optionBody: { flex: 1, gap: 4 },
  optionTitle: { ...Font.t4, color: Colors.onSurface },
  optionTitleSelected: { color: Colors.primary },
  optionDesc: { ...Font.caption, color: Colors.onSurfaceVariant, lineHeight: 18 },
  optionDescSelected: { color: Colors.primary },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.outline,
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },

  notice: { backgroundColor: Colors.primaryContainer, borderRadius: Radius.md, padding: 14 },
  noticeText: { ...Font.caption, color: Colors.primary, lineHeight: 20 },

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingVertical: 18, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.onPrimary, ...Font.t3 },
});
