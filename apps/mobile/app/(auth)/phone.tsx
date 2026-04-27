import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signInWithPhoneOtp } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { SUPPORTED_LANGUAGES, changeAppLanguage, type LangCode } from '../../lib/i18n';
import { Colors, Radius, Spacing, Font } from '../../constants/theme';
import { setCurrentScreen } from '../../lib/crashlytics';
import CountryPicker from '../../components/CountryPicker';

export default function PhoneScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { setConfirmationResult } = useAuthStore();
  const [countryCode, setCountryCode] = useState('+84');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setCurrentScreen('auth/phone'); }, []);

  async function handleSendOtp() {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const raw = phone.trim();
      const normalized = raw.startsWith('0') ? raw.slice(1) : raw;
      const confirmation = await signInWithPhoneOtp(`${countryCode}${normalized}`);
      setConfirmationResult(confirmation);
      router.push('/(auth)/otp');
    } catch {
      Alert.alert(t('common.error'), t('auth.otp_send_fail'));
    } finally {
      setLoading(false);
    }
  }

  async function handleLanguageChange(code: LangCode) {
    await changeAppLanguage(code);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Language Selector */}
        <View style={styles.langRow}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langBtn, i18n.language === lang.code && styles.langBtnActive]}
              onPress={() => handleLanguageChange(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, i18n.language === lang.code && styles.langLabelActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.title}>{t('auth.gada_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.phone_start')}</Text>
        </View>

        {/* Country Code Selector */}
        <CountryPicker value={countryCode} onChange={setCountryCode} />

        {/* Phone Input */}
        <TextInput
          style={styles.input}
          placeholder={t('auth.phone_placeholder')}
          placeholderTextColor={Colors.disabled}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          maxLength={12}
        />

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, (loading || !phone.trim()) && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={loading || !phone.trim()}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {loading ? t('common.loading') : t('auth.login')}
          </Text>
        </TouchableOpacity>

        {/* Signup Link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupHint}>{t('auth.no_account')}</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.7}>
            <Text style={styles.signupLink}>{t('auth.go_signup')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  inner: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },

  langRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.outline,
  },
  langBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  langFlag: { fontSize: 16 },
  langLabel: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '500' },
  langLabelActive: { color: Colors.primary, fontWeight: '700' },

  logoArea: { alignItems: 'center', marginBottom: Spacing.xl },
  title: { ...Font.h1, color: Colors.primary, textAlign: 'center', marginBottom: Spacing.xs },
  subtitle: { ...Font.body2, color: Colors.onSurfaceVariant, textAlign: 'center' },

  input: {
    borderWidth: 1.5, borderColor: Colors.outline, borderRadius: Radius.md,
    padding: Spacing.lg, ...Font.body1, color: Colors.onSurface,
  },

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.onPrimary, ...Font.t3 },

  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  signupHint: { ...Font.body3, color: Colors.onSurfaceVariant },
  signupLink: { ...Font.body3, color: Colors.primary, fontWeight: '700' },
});
