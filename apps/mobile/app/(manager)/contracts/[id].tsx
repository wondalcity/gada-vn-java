import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api-client';
import { showToast } from '../../../lib/toast';
import { ContractDocument, type MobileContract } from '../../../components/ContractDocument';

interface Contract extends MobileContract {
  contractHtml?: string;
}

export default function ManagerContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Contract>(`/contracts/${id}`);
      setContract(data);
    } catch {
      showToast({ message: t('contract.load_fail', '계약서를 불러오지 못했습니다'), type: 'error' });
      router.back();
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
          {isSigned ? t('contract.worker_signed') : t('contract.worker_waiting')}
        </Text>
        {isSigned && contract.workerSignedAt && (
          <Text style={styles.statusSub}>
            {t('contract.signed_date', { date: new Date(contract.workerSignedAt).toLocaleString('ko-KR') })}
          </Text>
        )}
      </View>

      {/* Styled contract document with language tabs */}
      <ContractDocument contract={contract} />

      <View style={{ height: 32 }} />
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
});
