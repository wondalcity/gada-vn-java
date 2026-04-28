import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signInWithPhoneOtp, signInWithGoogle } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { SUPPORTED_LANGUAGES, changeAppLanguage, type LangCode } from '../../lib/i18n';
import { Colors, Radius, Spacing, Font } from '../../constants/theme';
import CountryPicker from '../../components/CountryPicker';
import { logEvent } from '../../lib/crashlytics';

export default function SignupScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { setPendingName, setConfirmationResult } = useAuthStore();
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+84');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const canSend = name.trim().length >= 2 && phone.trim().length > 0;

  async function handleSendOtp() {
    if (!canSend) return;
    setLoading(true);
    try {
      const raw = phone.trim();
      const normalized = raw.startsWith('0') ? raw.slice(1) : raw;
      const fullNumber = `${countryCode}${normalized}`;
      logEvent(`Auth: signup OTP send attempt — ${fullNumber.replace(/\d(?=\d{4})/g, '*')}`);

      // Firebase Phone Auth (실제 SMS) — 스테이징/프로덕션 공통
      const confirmation = await signInWithPhoneOtp(fullNumber);
      setPendingName(name.trim());
      setConfirmationResult(confirmation);
      logEvent('Auth: signup — Firebase SMS');

      router.push('/(auth)/otp');
    } catch (e) {
      const code = (e as any)?.code ?? (e as any)?.statusCode ?? 'unknown';
      const msg = e instanceof Error ? e.message : String(e);
      logEvent(`Auth: signup OTP send failed — code=${code} msg=${msg}`);
      Alert.alert(t('common.error'), `${t('auth.otp_send_fail')}\n${msg || code}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      logEvent('Auth: signup Google sign-in attempt');
      await signInWithGoogle();
      // Auth state listener in _layout.tsx handles routing
    } catch (e) {
      const code = (e as any)?.code ?? '';
      // Silently ignore user-initiated cancellation
      if (code === 'SIGN_IN_CANCELLED' || code === '-3' || code === '12501') {
        logEvent('Auth: signup Google sign-in cancelled by user');
        return;
      }
      logEvent(`Auth: signup Google sign-in failed — code=${code}`);
      Alert.alert(t('common.error'), t('auth.google_login_fail'));
    } finally {
      setGoogleLoading(false);
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

        {/* Hero */}
        <View style={styles.heroArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>GADA VN</Text>
          </View>
          <Text style={styles.heroTitle}>{t('auth.signup_subtitle')}</Text>
          <Text style={styles.heroDesc}>{t('auth.signup_desc')}</Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {t('auth.name_label')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.name_placeholder')}
            placeholderTextColor={Colors.disabled}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            autoCapitalize="words"
            maxLength={50}
            returnKeyType="next"
          />
        </View>

        {/* Country Code */}
        <View style={styles.fieldGroup}>
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
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.button, (!canSend || loading) && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={!canSend || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {loading ? t('common.loading') : t('auth.register')}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.or_social')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In */}
        <TouchableOpacity
          style={[styles.googleBtn, googleLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.googleBtnText}>
            {googleLoading ? t('common.loading') : `G  ${t('auth.google_login')}`}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginHint}>{t('auth.have_account')}</Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.loginLink}>{t('auth.go_login')}</Text>
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

  heroArea: { alignItems: 'center', marginBottom: Spacing.lg },
  logoBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginBottom: Spacing.md,
  },
  logoText: { ...Font.t3, color: Colors.onPrimary, fontWeight: '800', letterSpacing: 2 },
  heroTitle: { ...Font.h3, color: Colors.onSurface, textAlign: 'center', marginBottom: Spacing.sm },
  heroDesc: { ...Font.body3, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },

  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { ...Font.body3, fontWeight: '600', color: Colors.onSurface },
  required: { color: '#ED1C24' },

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

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.outline },
  dividerText: { ...Font.caption, color: Colors.onSurfaceVariant },

  googleBtn: {
    borderWidth: 1.5, borderColor: Colors.outline, borderRadius: Radius.pill,
    paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.surface,
  },
  googleBtnText: { ...Font.t4, color: Colors.onSurface, fontWeight: '600' },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  loginHint: { ...Font.body3, color: Colors.onSurfaceVariant },
  loginLink: { ...Font.body3, color: Colors.primary, fontWeight: '700' },
});
