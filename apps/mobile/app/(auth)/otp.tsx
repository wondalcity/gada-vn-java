import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Radius, Spacing, Font } from '../../constants/theme';
import { setCurrentScreen, logEvent } from '../../lib/crashlytics';

export default function OtpScreen() {
  const { t } = useTranslation();
  const { confirmationResult, setConfirmationResult } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setCurrentScreen('auth/otp'); }, []);

  async function handleVerify() {
    if (otp.length < 6 || !confirmationResult) return;
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      setConfirmationResult(null);
      logEvent('Auth: OTP verification succeeded');
      // Auth state listener in _layout.tsx handles routing after Firebase confirms
    } catch (e) {
      logEvent(`Auth: OTP verification failed — ${e instanceof Error ? e.message : String(e)}`);
      Alert.alert(t('common.error'), t('auth.otp_error'));
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
