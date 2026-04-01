import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

type WorkStatus = 'APPLIED' | 'HIRED' | 'COMPLETED';

interface MyJob {
  id: string;
  jobId: string;
  title: string;
  siteNameVi: string;
  workDate: string;
  dailyWage: number;
  status: WorkStatus;
  contractId?: string;
}

// TAB_LABELS and STATUS_CONFIG are built inside the component to use t()


function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫';
}

export default function WorkerWorkScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkStatus>('APPLIED');

  const TAB_LABELS: { key: WorkStatus; label: string }[] = [
    { key: 'APPLIED',   label: t('worker.work_tab_applied') },
    { key: 'HIRED',     label: t('worker.work_tab_hired') },
    { key: 'COMPLETED', label: t('worker.work_tab_completed') },
  ];

  const STATUS_CONFIG: Record<WorkStatus, { bg: string; text: string; label: string }> = {
    APPLIED:   { bg: Colors.primaryContainer, text: Colors.primary,           label: t('worker.work_status_applied') },
    HIRED:     { bg: Colors.successContainer, text: Colors.onSuccessContainer, label: t('worker.work_status_hired') },
    COMPLETED: { bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant,   label: t('worker.work_status_completed') },
  };
  const [allJobs, setAllJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const data = await api.get<MyJob[]>('/applications/mine');
      setAllJobs(data);
    } catch {
      setAllJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  function onRefresh() {
    setRefreshing(true);
    loadJobs();
  }

  const filtered = allJobs.filter((j) => j.status === activeTab);

  const counts: Record<WorkStatus, number> = {
    APPLIED:   allJobs.filter(j => j.status === 'APPLIED').length,
    HIRED:     allJobs.filter(j => j.status === 'HIRED').length,
    COMPLETED: allJobs.filter(j => j.status === 'COMPLETED').length,
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
              {counts[key] > 0 && (
                <Text style={activeTab === key ? styles.tabCountActive : styles.tabCount}>
                  {' '}{counts[key]}
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
              {activeTab === 'APPLIED' ? t('worker.no_applied_jobs')
               : activeTab === 'HIRED' ? t('worker.no_hired_jobs')
               : t('worker.no_completed_jobs')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(worker)/jobs/[id]', params: { id: item.jobId } })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
              </View>

              <Text style={styles.siteName}>{item.siteNameVi}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📅</Text>
                  <Text style={styles.metaText}>{formatDate(item.workDate)}</Text>
                </View>
                <Text style={styles.wage}>{formatVnd(item.dailyWage)}</Text>
              </View>

              {item.status === 'HIRED' && item.contractId && (
                <TouchableOpacity
                  style={styles.contractBtn}
                  onPress={() => router.push({ pathname: '/(worker)/contracts/[id]', params: { id: item.contractId! } })}
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
