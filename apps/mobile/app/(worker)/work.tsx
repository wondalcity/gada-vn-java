import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

type WorkStatus = 'PENDING' | 'ACCEPTED' | 'CONTRACTED' | 'REJECTED' | 'WITHDRAWN';

interface MyApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  siteName: string;
  workDate: string;
  dailyWage: number;
  status: WorkStatus;
  contractId?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫';
}

export default function WorkerWorkScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkStatus>('PENDING');

  const TAB_LABELS: { key: WorkStatus; label: string }[] = [
    { key: 'PENDING',    label: t('worker.work_tab_applied') },
    { key: 'ACCEPTED',   label: t('worker.work_tab_hired') },
    { key: 'CONTRACTED', label: t('worker.work_tab_completed') },
  ];

  const STATUS_CONFIG: Record<WorkStatus, { bg: string; text: string; label: string }> = {
    PENDING:    { bg: Colors.primaryContainer, text: Colors.primary,           label: t('worker.work_status_applied') },
    ACCEPTED:   { bg: Colors.successContainer, text: Colors.onSuccessContainer, label: t('worker.work_status_hired') },
    CONTRACTED: { bg: '#E6F9E6',               text: '#1A6B1A',                 label: t('worker.work_status_completed') },
    REJECTED:   { bg: Colors.errorContainer,   text: Colors.onErrorContainer,   label: '거절됨' },
    WITHDRAWN:  { bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant,   label: '취소됨' },
  };

  const [allApplications, setAllApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadApplications = useCallback(async () => {
    try {
      const data = await api.get<MyApplication[]>('/applications/mine');
      setAllApplications(Array.isArray(data) ? data : []);
    } catch {
      setAllApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  function onRefresh() {
    setRefreshing(true);
    loadApplications();
  }

  const filtered = allApplications.filter((j) => j.status === activeTab);

  const counts = {
    PENDING:    allApplications.filter(j => j.status === 'PENDING').length,
    ACCEPTED:   allApplications.filter(j => j.status === 'ACCEPTED').length,
    CONTRACTED: allApplications.filter(j => j.status === 'CONTRACTED').length,
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabs}>
        {TAB_LABELS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
              {label}
              {counts[key as keyof typeof counts] > 0 && (
                <Text style={activeTab === key ? styles.tabCountActive : styles.tabCount}>
                  {' '}{counts[key as keyof typeof counts]}
                </Text>
              )}
            </Text>
            {activeTab === key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'PENDING' ? t('worker.no_applied_jobs')
               : activeTab === 'ACCEPTED' ? t('worker.no_hired_jobs')
               : t('worker.no_completed_jobs')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] ?? { bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant, label: item.status };
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(worker)/jobs/[id]', params: { id: item.jobId } })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.jobTitle}</Text>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
              </View>

              <Text style={styles.siteName}>{item.siteName}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📅</Text>
                  <Text style={styles.metaText}>{formatDate(item.workDate)}</Text>
                </View>
                <Text style={styles.wage}>{formatVnd(item.dailyWage)}</Text>
              </View>

              {item.status === 'ACCEPTED' && item.contractId && (
                <TouchableOpacity
                  style={styles.contractBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({ pathname: '/(worker)/contracts/[id]', params: { id: item.contractId! } });
                  }}
                >
                  <Text style={styles.contractBtnText}>{t('worker.view_contract')}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    position: 'relative',
  },
  tabActive: {},
  tabText: { ...Font.t4, color: Colors.onSurfaceVariant },
  tabTextActive: { color: Colors.primary },
  tabCount: { color: Colors.onSurfaceVariant },
  tabCountActive: { color: Colors.primary },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, borderRadius: 1, backgroundColor: Colors.primary,
  },

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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, ...Font.t4, color: Colors.onSurface },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { ...Font.caption, fontWeight: '700' },
  siteName: { ...Font.body3, color: Colors.onSurfaceVariant },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 12 },
  metaText: { ...Font.caption, color: Colors.onSurfaceVariant },
  wage: { ...Font.t3, color: Colors.primary },

  contractBtn: {
    marginTop: 4,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.outline,
  },
  contractBtnText: { ...Font.body3, color: Colors.primary, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant },
});
