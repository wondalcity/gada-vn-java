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
  const {
    pendingPhone, confirmationResult,
    devOtp, clearPendingPhone, setConfirmationResult, setDevOtp, setUser,
  } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setCurrentScreen('auth/otp'); }, []);

  // 스테이징 devOtp 자동 입력
  useEffect(() => {
    if (devOtp) setOtp(devOtp);
  }, [devOtp]);

  async function handleVerify() {
    if (otp.length < 6) return;
    setLoading(true);

    try {
      if (confirmationResult) {
        // ── Firebase Phone Auth flow (프로덕션 일반 폰) ──────────────────────
        // 웹앱의 confirmFirebaseOtp → /auth/verify-token 흐름과 동일
        await confirmationResult.confirm(otp);
        setConfirmationResult(null);
        logEvent('Auth: Firebase OTP confirmed');

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

        logEvent(`Auth: Firebase login complete — role=${role} isNew=${syncResult.isNew}`);
        router.replace(role === 'MANAGER' ? '/(auth)/mode' : '/(worker)');

      } else if (pendingPhone) {
        // ── 서버 OTP flow (스테이징 전체 / 프로덕션 테스트폰) ─────────────────
        // 웹앱의 /auth/otp/verify → devToken or customToken 흐름과 동일
        const result = await api.post<{
          customToken?: string;
          devToken?: string;
          isNewUser?: boolean;
        }>('/auth/otp/verify', { phone: pendingPhone, otp });

        clearPendingPhone();
        setDevOtp(null);
        logEvent('Auth: server OTP verified');

        if (result.customToken) {
          // customToken → Firebase 로그인 → ID 토큰 동기화
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

          logEvent(`Auth: server OTP login (customToken) — role=${role} isNew=${syncResult.isNew}`);
          router.replace(role === 'MANAGER' ? '/(auth)/mode' : '/(worker)');

        } else if (result.devToken) {
          // devToken → SecureStore 저장 → /auth/me
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

          logEvent(`Auth: server OTP login (devToken) — role=${role} isNew=${result.isNewUser}`);
          router.replace(role === 'MANAGER' ? '/(auth)/mode' : '/(worker)');

        } else {
          throw new Error('no_token_in_response');
        }
      } else {
        throw new Error('no_pending_auth');
      }
    } catch (e) {
      const code = (e as any)?.code ?? '';
      const msg = e instanceof Error ? e.message : String(e);
      logEvent(`Auth: OTP verification failed — code=${code} msg=${msg}`);
      // Firebase 오류 코드 → 사용자 메시지 매핑
      if (code === 'auth/invalid-verification-code' || code === 'auth/invalid-credential') {
        Alert.alert(t('common.error'), t('auth.otp_error'));
      } else if (code === 'auth/code-expired' || code === 'auth/session-expired') {
        Alert.alert(t('common.error'), t('auth.otp_expired') ?? t('auth.otp_error'));
      } else {
        Alert.alert(t('common.error'), t('common.process_fail'));
      }
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
