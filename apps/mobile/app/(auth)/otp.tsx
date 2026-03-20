import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';

export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { confirmationToken } = useLocalSearchParams<{ confirmationToken: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  async function handleVerify() {
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const confirmation = JSON.parse(confirmationToken);
      await confirmation.confirm(otp);
      // Auth state listener in index.tsx will handle routing
    } catch {
      Alert.alert('오류', '인증번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.otp_title')}</Text>
      <Text style={styles.subtitle}>{t('auth.otp_sent')}</Text>

      <TextInput
        style={styles.input}
        placeholder="000000"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
        textAlign="center"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || otp.length < 6}
      >
        <Text style={styles.buttonText}>
          {loading ? t('common.loading') : t('common.confirm')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 16, fontSize: 32, letterSpacing: 8, marginBottom: 20,
  },
  button: { backgroundColor: '#FF6B2C', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
