import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signInWithPhoneOtp } from '../../lib/firebase';

const COUNTRY_CODES = [
  { code: '+84', flag: '🇻🇳', label: 'VN' },
  { code: '+82', flag: '🇰🇷', label: 'KR' },
];

export default function PhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [countryCode, setCountryCode] = useState('+84');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const confirmation = await signInWithPhoneOtp(`${countryCode}${phone}`);
      router.push({ pathname: '/(auth)/otp', params: { confirmationToken: JSON.stringify(confirmation) } });
    } catch (err) {
      Alert.alert('오류', '인증번호 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>가다 VN</Text>
        <Text style={styles.subtitle}>전화번호로 시작하세요</Text>

        <View style={styles.phoneRow}>
          {COUNTRY_CODES.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[styles.countryBtn, countryCode === c.code && styles.countryBtnActive]}
              onPress={() => setCountryCode(c.code)}
            >
              <Text>{c.flag} {c.code}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('auth.phone_placeholder')}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          maxLength={12}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={loading || !phone.trim()}
        >
          <Text style={styles.buttonText}>
            {loading ? t('common.loading') : t('auth.login')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FF6B2C', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  countryBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  countryBtnActive: { borderColor: '#FF6B2C', backgroundColor: '#FFF3EE' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 16, fontSize: 18, marginBottom: 20,
  },
  button: { backgroundColor: '#FF6B2C', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
