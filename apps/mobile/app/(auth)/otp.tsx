import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import auth from '@react-native-firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/auth.store';
import { syncAuthToken } from '../../lib/firebase';
import { api } from '../../lib/api-client';
import { Colors, Radius, Spacing, Font } from '../../constants/theme';
import { setCurrentScreen, logEvent } from '../../lib/crashlytics';

export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { pendingPhone, devOtp, clearPendingPhone, setDevOtp, setUser } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setCurrentScreen('auth/otp'); }, []);

  // 스테이징: devOtp가 있으면 자동 입력
  useEffect(() => {
    if (devOtp) setOtp(devOtp);
  }, [devOtp]);

  async function handleVerify() {
    if (otp.length < 6 || !pendingPhone) return;
    setLoading(true);

    try {
      // 서버 OTP 검증 — 웹앱과 동일한 /auth/otp/verify 엔드포인트 사용
      // (Firebase Phone Auth 대신 서버 검증을 사용해 SHA-1 불필요)
      const result = await api.post<{
        customToken?: string;
        devToken?: string;
        isNewUser?: boolean;
      }>('/auth/otp/verify', { phone: pendingPhone, otp });

      clearPendingPhone();
      setDevOtp(null);
      logEvent('Auth: OTP verification succeeded');

      if (result.customToken) {
        // 프로덕션: Firebase Custom Token으로 로그인 후 ID 토큰 동기화
        // 웹앱의 signInWithCustomTokenAndGetIdToken과 동일한 흐름
        await auth().signInWithCustomToken(result.customToken);
        const syncResult = await syncAuthToken();
        if (!syncResult) throw new Error('token_sync_failed');

        const user = syncResult.user as { id: string; isManager?: boolean };
        const role: 'WORKER' | 'MANAGER' = user.isManager ? 'MANAGER' : 'WORKER';
        setUser(user.id, role, user.isManager ?? false);

        if (syncResult.isNew) {
          const { pendingName } = useAuthStore.getState();
          if (pendingName) {
            try { await api.post('/auth/register', { name: pendingName }); } catch {}
            useAuthStore.getState().clearPendingName();
          }
        }

        logEvent(`Auth: OTP login complete (customToken) — role=${role} isNew=${syncResult.isNew}`);
        router.replace(role === 'MANAGER' ? '/(manager)/home' : '/(worker)');

      } else if (result.devToken) {
        // 스테이징: devToken을 직접 저장 후 /auth/me로 프로필 조회
        // 웹앱의 setSessionCookie(devToken) 패턴과 동일
        await SecureStore.setItemAsync('auth_token', result.devToken);
        const profile = await api.get<{ id: string; isManager?: boolean } | null>('/auth/me');
        if (!profile) throw new Error('profile_load_failed');

        const role: 'WORKER' | 'MANAGER' = profile.isManager ? 'MANAGER' : 'WORKER';
        setUser(profile.id, role, profile.isManager ?? false);

        if (result.isNewUser) {
          const { pendingName } = useAuthStore.getState();
          if (pendingName) {
            try { await api.post('/auth/register', { name: pendingName }); } catch {}
            useAuthStore.getState().clearPendingName();
          }
        }

        logEvent(`Auth: OTP login complete (devToken) — role=${role} isNew=${result.isNewUser}`);
        router.replace(role === 'MANAGER' ? '/(manager)/home' : '/(worker)');

      } else {
        throw new Error('no_token_in_response');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logEvent(`Auth: OTP verification failed — ${msg}`);
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

      {/* 스테이징 devOtp 힌트 */}
      {devOtp ? (
        <Text style={styles.devHint}>개발 코드: {devOtp}</Text>
      ) : null}

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
    marginBottom: Spacing.sm, color: Colors.onSurface,
  },
  devHint: {
    ...Font.caption, color: Colors.primary, textAlign: 'center',
    marginBottom: Spacing.xl, fontWeight: '600',
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.onPrimary, ...Font.t3 },
});
