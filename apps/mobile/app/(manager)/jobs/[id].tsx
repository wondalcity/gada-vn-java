import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      Alert.alert(t('jobs.accept_success_title'), t('jobs.accept_success_body'), [
        { text: t('jobs.view_contract'), onPress: () => router.push({ pathname: '/(manager)/contracts/[id]', params: { id: contract.id } }) },
        { text: t('common.close') },
      ]);
      load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('common.process_fail');
      Alert.alert(t('common.error'), msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(applicationId: string) {
    Alert.alert(t('jobs.reject_confirm_title'), t('jobs.reject_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.reject_button'),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(applicationId);
          try {
            await api.put(`/applications/${applicationId}/status`, { status: 'REJECTED' });
            load();
          } catch {
            Alert.alert(t('common.error'), t('common.process_fail'));
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
      PENDING: t('jobs.status_pending'), ACCEPTED: t('jobs.status_accepted'),
      REJECTED: t('jobs.status_rejected'), CONTRACTED: t('jobs.status_contracted'),
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
        <Text style={styles.header}>{t('jobs.applicants_header', { count: applications.length })}</Text>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('jobs.no_applicants')}</Text>
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
              <Text style={styles.metaText}>{t('jobs.experience_label', { years: Math.floor(item.experience_months / 12), months: item.experience_months % 12 })}</Text>
            )}
            {item.current_province && (
              <Text style={styles.metaText}>📍 {item.current_province}</Text>
            )}
            <Text style={styles.metaText}>
              {t('jobs.applied_date', { date: new Date(item.applied_at).toLocaleDateString('ko-KR') })}
            </Text>
          </View>

          {item.status === 'PENDING' && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.rejectBtn, actionLoading === item.id && styles.btnLoading]}
                onPress={() => handleReject(item.id)}
                disabled={actionLoading === item.id}
              >
                <Text style={styles.rejectBtnText}>{t('jobs.reject_button')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, actionLoading === item.id && styles.btnLoading]}
                onPress={() => handleAccept(item.id)}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.acceptBtnText}>{t('jobs.accept_button')}</Text>
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
