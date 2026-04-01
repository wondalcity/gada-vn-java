import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  Linking, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

type ApplicationStatus = 'APPLIED' | 'HIRED' | 'REJECTED' | 'COMPLETED';

interface WorkerApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  workDate: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  workerTrades: string[];
  experienceYears?: number;
  status: ApplicationStatus;
}

const DEMO_APPLICATIONS: WorkerApplication[] = [
  { id: 'dapp-1', jobId: 'djob-1', jobTitle: '강남구 철근 작업 모집', workDate: '2026-04-05', workerId: 'dw-1', workerName: '김민준', workerPhone: '+82 10-1234-5678', workerTrades: ['철근공'], experienceYears: 3, status: 'HIRED' },
  { id: 'dapp-2', jobId: 'djob-1', jobTitle: '강남구 철근 작업 모집', workDate: '2026-04-05', workerId: 'dw-2', workerName: '이서준', workerPhone: '+82 10-2345-6789', workerTrades: ['철근공'], experienceYears: 5, status: 'APPLIED' },
  { id: 'dapp-3', jobId: 'djob-2', jobTitle: '서초 오피스텔 미장 작업', workDate: '2026-04-07', workerId: 'dw-3', workerName: '박도윤', workerPhone: '+82 10-3456-7890', workerTrades: ['미장공'], experienceYears: 2, status: 'APPLIED' },
  { id: 'dapp-4', jobId: 'djob-3', jobTitle: '마포구 배관 설치', workDate: '2026-04-10', workerId: 'dw-4', workerName: '최현우', workerPhone: '+82 10-4567-8901', workerTrades: ['배관공'], experienceYears: 6, status: 'COMPLETED' },
  { id: 'dapp-5', jobId: 'djob-5', jobTitle: '성동구 신축 도장 작업', workDate: '2026-04-12', workerId: 'dw-5', workerName: '정시우', workerPhone: '+82 10-5678-9012', workerTrades: ['도장공'], experienceYears: 4, status: 'HIRED' },
  { id: 'dapp-6', jobId: 'djob-2', jobTitle: '서초 오피스텔 미장 작업', workDate: '2026-04-07', workerId: 'dw-6', workerName: '강지훈', workerPhone: '+82 10-6789-0123', workerTrades: ['미장공'], experienceYears: 1, status: 'REJECTED' },
]

// STATUS_CONFIG and TAB_FILTERS built inside component to use t()


function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  const p = phone.trim()
  if (p.startsWith('+84')) {
    const d = p.slice(3)
    if (d.length === 9) return `+84 ${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
  }
  if (p.startsWith('+82')) {
    const d = p.slice(3)
    if (d.length >= 9) return `+82 ${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(d.length - 4)}`
  }
  return p
}

export default function ManagerWorkersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [applications, setApplications] = useState<WorkerApplication[]>([]);

  const STATUS_CONFIG: Record<ApplicationStatus, { bg: string; text: string; label: string }> = {
    APPLIED:   { bg: Colors.primaryContainer, text: Colors.primary,           label: t('manager.tab_filter_applied') },
    HIRED:     { bg: Colors.successContainer, text: Colors.onSuccessContainer, label: t('manager.tab_filter_hired') },
    REJECTED:  { bg: Colors.errorContainer,   text: Colors.onErrorContainer,   label: t('manager.worker_reject_button') },
    COMPLETED: { bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant,   label: t('manager.tab_filter_completed') },
  };

  const TAB_FILTERS: { key: ApplicationStatus | 'ALL'; label: string }[] = [
    { key: 'ALL',       label: t('manager.tab_filter_all') },
    { key: 'APPLIED',   label: t('manager.tab_filter_applied') },
    { key: 'HIRED',     label: t('manager.tab_filter_hired') },
    { key: 'COMPLETED', label: t('manager.tab_filter_completed') },
  ];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | 'ALL'>('ALL');

  const loadApplications = useCallback(async () => {
    try {
      const data = await api.get<WorkerApplication[]>('/manager/applications');
      setApplications(data.length > 0 ? data : DEMO_APPLICATIONS);
    } catch {
      setApplications(DEMO_APPLICATIONS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  async function handleHire(applicationId: string) {
    try {
      await api.patch(`/manager/applications/${applicationId}/accept`);
      loadApplications();
    } catch {
      Alert.alert(t('common.error'), t('manager.worker_hire_fail'));
    }
  }

  async function handleReject(applicationId: string) {
    Alert.alert(t('manager.worker_reject_title'), t('manager.worker_reject_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('manager.worker_reject_button'), style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/manager/applications/${applicationId}/reject`);
            loadApplications();
          } catch {
            Alert.alert(t('common.error'), t('manager.worker_reject_fail'));
          }
        },
      },
    ]);
  }

  function handleCall(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  const filtered = activeFilter === 'ALL'
    ? applications
    : applications.filter(a => a.status === activeFilter);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterBar}>
        {TAB_FILTERS.map(({ key, label }) => {
          const count = key === 'ALL'
            ? applications.length
            : applications.filter(a => a.status === key).length;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, activeFilter === key && styles.filterChipActive]}
              onPress={() => setActiveFilter(key)}
            >
              <Text style={[styles.filterChipText, activeFilter === key && styles.filterChipTextActive]}>
                {label}{count > 0 ? ` ${count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApplications(); }} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👷</Text>
            <Text style={styles.emptyText}>{t('manager.worker_no_applicants')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <View style={styles.card}>
              {/* Worker info header */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {item.workerName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{item.workerName}</Text>
                  <Text style={styles.workerPhone}>{formatPhone(item.workerPhone)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
              </View>

              {/* Trade chips */}
              {item.workerTrades.length > 0 && (
                <View style={styles.chips}>
                  {item.workerTrades.slice(0, 3).map((trade) => (
                    <View key={trade} style={styles.chip}>
                      <Text style={styles.chipText}>{trade}</Text>
                    </View>
                  ))}
                  {item.experienceYears !== undefined && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{t('manager.worker_experience', { years: item.experienceYears })}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Job reference */}
              <TouchableOpacity
                style={styles.jobRef}
                onPress={() => router.push({ pathname: '/(manager)/jobs/[id]', params: { id: item.jobId } })}
              >
                <Text style={styles.jobRefIcon}>🏗️</Text>
                <Text style={styles.jobRefText} numberOfLines={1}>
                  {item.jobTitle} · {formatDate(item.workDate)}
                </Text>
                <Text style={styles.jobRefArrow}>›</Text>
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(item.workerPhone)}
                >
                  <Text style={styles.callBtnText}>{t('manager.worker_call_button')}</Text>
                </TouchableOpacity>

                {item.status === 'APPLIED' && (
                  <>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(item.id)}
                    >
                      <Text style={styles.rejectBtnText}>{t('manager.worker_reject_action')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.hireBtn}
                      onPress={() => handleHire(item.id)}
                    >
                      <Text style={styles.hireBtnText}>{t('manager.worker_hire_action')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceContainer,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  filterChipTextActive: { color: Colors.onPrimary },

  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: Colors.shadowBlack,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Font.t4, color: Colors.primary },
  workerInfo: { flex: 1 },
  workerName: { ...Font.t4, color: Colors.onSurface },
  workerPhone: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { ...Font.caption, fontWeight: '700' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: Colors.onSecondary },

  jobRef: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.xs,
    padding: Spacing.sm,
  },
  jobRefIcon: { fontSize: 12 },
  jobRefText: { ...Font.caption, color: Colors.onSurfaceVariant, flex: 1 },
  jobRefArrow: { fontSize: 14, color: Colors.onSurfaceVariant },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  callBtn: {
    flex: 1, paddingVertical: 9,
    borderRadius: Radius.xs,
    borderWidth: 1, borderColor: Colors.outline,
    alignItems: 'center',
  },
  callBtnText: { ...Font.body3, color: Colors.onSurface, fontWeight: '600' },
  rejectBtn: {
    paddingVertical: 9, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xs,
    borderWidth: 1, borderColor: Colors.error,
    alignItems: 'center',
  },
  rejectBtnText: { ...Font.body3, color: Colors.error, fontWeight: '600' },
  hireBtn: {
    paddingVertical: 9, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  hireBtnText: { ...Font.body3, color: Colors.onPrimary, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant },
});
