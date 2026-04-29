import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signInWithPhoneOtp, signInWithGoogle } from '../../lib/firebase';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../store/auth.store';
import { SUPPORTED_LANGUAGES, changeAppLanguage, type LangCode } from '../../lib/i18n';
import { Colors, Radius, Spacing, Font } from '../../constants/theme';
import { setCurrentScreen, logEvent } from '../../lib/crashlytics';
import { showToast } from '../../lib/toast';
import CountryPicker from '../../components/CountryPicker';

// 프로덕션 빌드 여부 — Firebase Phone Auth를 쓸 수 있는 환경인지 판단
// EXPO_PUBLIC_FIREBASE_DISABLE_APP_VERIFY=true 이면 APNs 미설정 preview 빌드이므로
// IS_PRODUCTION=false 로 처리하여 서버 OTP 흐름을 사용한다
const IS_PRODUCTION =
  process.env.EXPO_PUBLIC_APP_ENV === 'production' &&
  process.env.EXPO_PUBLIC_FIREBASE_DISABLE_APP_VERIFY !== 'true';

export default function PhoneScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { setPendingPhone, setDevOtp, setConfirmationResult } = useAuthStore();
  const [countryCode, setCountryCode] = useState('+84');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setCurrentScreen('auth/phone');
  }, []);

  async function handleSendOtp() {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const raw = phone.trim();
      const normalized = raw.startsWith('0') ? raw.slice(1) : raw;
      const fullNumber = `${countryCode}${normalized}`;
      logEvent(`Auth: OTP send attempt — ${fullNumber.replace(/\d(?=\d{4})/g, '*')}`);

      if (IS_PRODUCTION) {
        // 프로덕션: 테스트폰 여부 확인 후 분기
        const testCheck = await api.get<{ isTest: boolean }>(
          `/auth/is-test-phone?phone=${encodeURIComponent(fullNumber)}`,
        );
        if (testCheck?.isTest) {
          // 테스트폰 → 서버 OTP (000000 고정)
          await api.post('/auth/otp/send', { phone: fullNumber });
          setPendingPhone(fullNumber);
          logEvent('Auth: test phone — server OTP');
        } else {
          // 일반폰 → Firebase Phone Auth (실제 SMS 발송)
          const confirmation = await signInWithPhoneOtp(fullNumber);
          setConfirmationResult(confirmation);
          logEvent('Auth: normal phone — Firebase SMS');
        }
      } else {
        // 스테이징: 서버 OTP flow (Firebase SMS 우회 — iOS APNs 불필요)
        const result = await api.post<{ message: string; devOtp?: string }>('/auth/otp/send', { phone: fullNumber });
        setPendingPhone(fullNumber);
        if (result?.devOtp) setDevOtp(result.devOtp);
        logEvent('Auth: staging — server OTP');
      }

      router.push('/(auth)/otp');
    } catch (e) {
      const code = (e as any)?.code ?? (e as any)?.statusCode ?? 'unknown';
      const msg = e instanceof Error ? e.message : String(e);
      logEvent(`Auth: OTP send failed — code=${code} msg=${msg}`);
      showToast({ message: `${t('auth.otp_send_fail', 'OTP 전송에 실패했습니다')}: ${msg || code}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      logEvent('Auth: Google sign-in attempt');
      await signInWithGoogle();
      // Auth state listener in _layout.tsx handles routing
    } catch (e) {
      const code = (e as any)?.code ?? '';
      // Silently ignore user-initiated cancellation
      if (code === 'SIGN_IN_CANCELLED' || code === '-3' || code === '12501') {
        logEvent('Auth: Google sign-in cancelled by user');
        return;
      }
      logEvent(`Auth: Google sign-in failed — code=${code}`);
      showToast({ message: t('auth.google_login_fail', 'Google 로그인에 실패했습니다'), type: 'error' });
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

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.outline },
  dividerText: { ...Font.caption, color: Colors.onSurfaceVariant },

  googleBtn: {
    borderWidth: 1.5, borderColor: Colors.outline, borderRadius: Radius.pill,
    paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.surface,
  },
  googleBtnText: { ...Font.t4, color: Colors.onSurface, fontWeight: '600' },

  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  signupHint: { ...Font.body3, color: Colors.onSurfaceVariant },
  signupLink: { ...Font.body3, color: Colors.primary, fontWeight: '700' },
});
