import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../lib/api-client';
import { showToast } from '../../lib/toast';

type BusinessType = 'INDIVIDUAL' | 'COMPANY';

export default function ManagerRegisterScreen() {
  const { t } = useTranslation();
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
      showToast({ message: t('manager.register_success_body', '관리자 등록이 완료되었습니다'), type: 'success' });
      router.replace('/(manager)/');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('manager.register_fail', '관리자 등록에 실패했습니다');
      showToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('manager.register_title')}</Text>
      <Text style={styles.subtitle}>{t('manager.register_subtitle')}</Text>

      {/* Business type toggle */}
      <Text style={styles.label}>{t('manager.field_business_type')}</Text>
      <View style={styles.segmented}>
        {(['INDIVIDUAL', 'COMPANY'] as BusinessType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.segment, businessType === type && styles.segmentActive]}
            onPress={() => setBusinessType(type)}
          >
            <Text style={[styles.segmentText, businessType === type && styles.segmentTextActive]}>
              {type === 'INDIVIDUAL' ? t('manager.business_individual') : t('manager.business_company')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('manager.field_representative')}</Text>
      <TextInput
        style={styles.input}
        placeholder="홍길동"
        value={representativeName}
        onChangeText={setRepresentativeName}
        autoCapitalize="none"
      />

      <Text style={styles.label}>{t('manager.field_company_name')}</Text>
      <TextInput
        style={styles.input}
        placeholder="(주)가다건설"
        value={companyName}
        onChangeText={setCompanyName}
      />

      <Text style={styles.label}>{t('manager.field_contact_phone')}</Text>
      <TextInput
        style={styles.input}
        placeholder="010-0000-0000"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
      />

      <View style={styles.notice}>
        <Text style={styles.noticeText}>{t('manager.register_notice')}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('manager.register_button')}</Text>
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
