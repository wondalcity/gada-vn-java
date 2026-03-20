import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api-client';

interface Contract {
  id: string;
  status: string;
  contract_html: string;
  worker_signed_at: string | null;
  created_at: string;
}

export default function ManagerContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Contract>(`/contracts/${id}`);
      setContract(data);
    } catch {
      Alert.alert('오류', '계약서를 불러올 수 없습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }
  if (!contract) return null;

  const isSigned = contract.status === 'FULLY_SIGNED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.statusBanner, isSigned ? styles.signed : styles.pending]}>
        <Text style={[styles.statusText, { color: isSigned ? '#2E7D32' : '#E65100' }]}>
          {isSigned ? '✅ 근로자 서명 완료' : '⏳ 근로자 서명 대기 중'}
        </Text>
        {isSigned && contract.worker_signed_at && (
          <Text style={styles.statusSub}>
            서명일: {new Date(contract.worker_signed_at).toLocaleString('ko-KR')}
          </Text>
        )}
      </View>

      <View style={styles.contractBox}>
        <Text style={styles.contractTitle}>근로계약서</Text>
        <View style={styles.divider} />
        <Text style={styles.contractText}>
          {contract.contract_html.replace(/<[^>]*>/g, '').trim()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBanner: { borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  signed: { backgroundColor: '#E8F5E9' },
  pending: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 12, color: '#888', marginTop: 4 },
  contractBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  contractTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginBottom: 16 },
  contractText: { fontSize: 14, color: '#444', lineHeight: 22 },
});
