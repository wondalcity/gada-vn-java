import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../lib/api-client';

type BusinessType = 'INDIVIDUAL' | 'COMPANY';

export default function ManagerRegisterScreen() {
  const router = useRouter();
  const [businessType, setBusinessType] = useState<BusinessType>('INDIVIDUAL');
  const [representativeName, setRepresentativeName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = representativeName.trim().length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    try {
      await api.post('/managers/register', {
        businessType,
        representativeName: representativeName.trim(),
        companyName: companyName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      Alert.alert(
        '신청 완료',
        '관리자 등록 신청이 접수되었습니다.\n심사 후 승인 알림을 드립니다.',
        [{ text: '확인', onPress: () => router.replace('/(manager)/') }],
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '등록에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>현장 관리자 등록</Text>
      <Text style={styles.subtitle}>심사 후 일자리 등록이 가능합니다</Text>

      {/* Business type toggle */}
      <Text style={styles.label}>사업 유형</Text>
      <View style={styles.segmented}>
        {(['INDIVIDUAL', 'COMPANY'] as BusinessType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.segment, businessType === type && styles.segmentActive]}
            onPress={() => setBusinessType(type)}
          >
            <Text style={[styles.segmentText, businessType === type && styles.segmentTextActive]}>
              {type === 'INDIVIDUAL' ? '개인' : '법인'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>대표자명 *</Text>
      <TextInput
        style={styles.input}
        placeholder="홍길동"
        value={representativeName}
        onChangeText={setRepresentativeName}
        autoCapitalize="none"
      />

      <Text style={styles.label}>회사명 (선택)</Text>
      <TextInput
        style={styles.input}
        placeholder="(주)가다건설"
        value={companyName}
        onChangeText={setCompanyName}
      />

      <Text style={styles.label}>연락처 (선택)</Text>
      <TextInput
        style={styles.input}
        placeholder="010-0000-0000"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
      />

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          📋 등록 후 관리자 검토가 진행됩니다. 승인까지 1-2 영업일 소요됩니다.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>등록 신청</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#1A1A1A',
  },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F8F8F8' },
  segmentActive: { backgroundColor: '#FF6B2C' },
  segmentText: { fontSize: 15, color: '#666', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  notice: { backgroundColor: '#FFF8F5', borderRadius: 12, padding: 16, marginTop: 24 },
  noticeText: { fontSize: 13, color: '#FF6B2C', lineHeight: 20 },
  button: {
    backgroundColor: '#FF6B2C', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 32,
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
