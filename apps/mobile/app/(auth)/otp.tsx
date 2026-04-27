import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { syncAuthToken } from '../../lib/firebase';
import { api } from '../../lib/api-client';
import { Colors, Radius, Spacing, Font } from '../../constants/theme';
import { setCurrentScreen, logEvent } from '../../lib/crashlytics';

export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { confirmationResult, setConfirmationResult, setUser } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setCurrentScreen('auth/otp'); }, []);

  async function handleVerify() {
    if (otp.length < 6 || !confirmationResult) return;
    setLoading(true);

    // Step 1: Firebase OTP 확인
    try {
      await confirmationResult.confirm(otp);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? 'unknown';
      const msg = e instanceof Error ? e.message : String(e);
      logEvent(`Auth: OTP confirm failed — code=${code} msg=${msg}`);
      Alert.alert(t('common.error'), `${t('auth.otp_error')}\n(${code})`);
      setLoading(false);
      return;
    }

    // Step 2: Firebase OTP 확인 성공 — 토큰 동기화 및 홈 화면 진입
    setConfirmationResult(null);
    logEvent('Auth: OTP verification succeeded');
    try {
      const result = await syncAuthToken();
      if (!result) throw new Error('token_sync_failed');

      const user = result.user as { id: string; isManager?: boolean };
      const role: 'WORKER' | 'MANAGER' = user.isManager ? 'MANAGER' : 'WORKER';
      setUser(user.id, role, user.isManager ?? false);

      if (result.isNew) {
        logEvent('Auth: new user — applying pending name if any');
        const { pendingName } = useAuthStore.getState();
        if (pendingName) {
          try { await api.post('/auth/register', { name: pendingName }); } catch {}
          useAuthStore.getState().clearPendingName();
        }
      }

      logEvent(`Auth: OTP login complete — role=${role} isNew=${result.isNew}`);
      router.replace(role === 'MANAGER' ? '/(manager)' : '/(worker)');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logEvent(`Auth: token sync failed after OTP — ${msg}`);
      Alert.alert(t('common.error'), t('common.process_fail'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{t('auth.otp_sent')}</Text>

      <TextInput
        style={styles.input}
        placeholder="000000"
        placeholderTextColor={Colors.disabled}
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
        textAlign="center"
      />

      <TouchableOpacity
        style={[styles.button, (loading || otp.length < 6) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || otp.length < 6}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {loading ? t('common.loading') : t('common.confirm')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.surface,
    justifyContent: 'center', padding: Spacing.xxl,
  },
  subtitle: { ...Font.body3, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.xxxl },
  input: {
    borderWidth: 1.5, borderColor: Colors.outline, borderRadius: Radius.md,
    padding: Spacing.lg, fontSize: 32, letterSpacing: 8,
    marginBottom: Spacing.xl, color: Colors.onSurface,
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.onPrimary, ...Font.t3 },
});
