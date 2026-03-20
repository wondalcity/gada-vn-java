import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../../lib/api-client';

interface Application {
  id: string;
  status: string;
  worker_name: string;
  experience_months: number | null;
  current_province: string | null;
  applied_at: string;
}

interface Contract {
  id: string;
  status: string;
}

export default function ManagerJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Application[]>(`/applications/job/${id}`);
      setApplications(data);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleAccept(applicationId: string) {
    setActionLoading(applicationId);
    try {
      await api.put(`/applications/${applicationId}/status`, { status: 'ACCEPTED' });
      // Generate contract immediately after acceptance
      const contract = await api.post<Contract>('/contracts/generate', { applicationId });
      Alert.alert('수락 완료', '지원자를 수락하고 계약서를 생성했습니다.', [
        { text: '계약서 확인', onPress: () => router.push({ pathname: '/(manager)/contracts/[id]', params: { id: contract.id } }) },
        { text: '닫기' },
      ]);
      load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '처리에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(applicationId: string) {
    Alert.alert('거절 확인', '이 지원자를 거절하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '거절',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(applicationId);
          try {
            await api.put(`/applications/${applicationId}/status`, { status: 'REJECTED' });
            load();
          } catch {
            Alert.alert('오류', '처리에 실패했습니다.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  function statusColor(status: string): string {
    const map: Record<string, string> = {
      PENDING: '#FF9800', ACCEPTED: '#4CAF50', REJECTED: '#F44336', CONTRACTED: '#2196F3',
    };
    return map[status] ?? '#999';
  }

  function statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: '검토 중', ACCEPTED: '수락됨', REJECTED: '거절됨', CONTRACTED: '계약 완료',
    };
    return map[status] ?? status;
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }

  return (
    <FlatList
      data={applications}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} colors={['#FF6B2C']} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.header}>지원자 목록 ({applications.length}명)</Text>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 지원자가 없습니다</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.workerName}>{item.worker_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                {statusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            {item.experience_months != null && (
              <Text style={styles.metaText}>경력 {Math.floor(item.experience_months / 12)}년 {item.experience_months % 12}개월</Text>
            )}
            {item.current_province && (
              <Text style={styles.metaText}>📍 {item.current_province}</Text>
            )}
            <Text style={styles.metaText}>
              지원일 {new Date(item.applied_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>

          {item.status === 'PENDING' && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.rejectBtn, actionLoading === item.id && styles.btnLoading]}
                onPress={() => handleReject(item.id)}
                disabled={actionLoading === item.id}
              >
                <Text style={styles.rejectBtnText}>거절</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, actionLoading === item.id && styles.btnLoading]}
                onPress={() => handleAccept(item.id)}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.acceptBtnText}>수락 + 계약서 발행</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  header: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workerName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardMeta: { gap: 4 },
  metaText: { fontSize: 13, color: '#666' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rejectBtn: {
    flex: 1, borderWidth: 1, borderColor: '#F44336', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  rejectBtnText: { color: '#F44336', fontWeight: '600' },
  acceptBtn: {
    flex: 2, backgroundColor: '#FF6B2C', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontWeight: '700' },
  btnLoading: { opacity: 0.6 },
});
