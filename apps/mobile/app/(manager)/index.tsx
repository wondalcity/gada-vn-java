import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, SectionList, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

type JobStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED';

interface ManagerJob {
  id: string;
  siteId: string;
  siteName: string;
  title: string;
  workDate: string;
  dailyWage: number;
  currency: string;
  slotsTotal: number;
  slotsFilled: number;
  status: JobStatus;
}

interface SiteSection {
  siteId: string;
  siteName: string;
  data: ManagerJob[];
}

type TabKey = JobStatus | 'ALL';

const STATUS_COLOR: Record<JobStatus, string> = {
  OPEN: Colors.success, FILLED: Colors.secondary, CANCELLED: Colors.disabled, COMPLETED: Colors.primary,
};

export default function ManagerJobsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const STATUS_TABS: { key: TabKey; label: string }[] = [
    { key: 'ALL',       label: t('jobs.status_all') },
    { key: 'OPEN',      label: t('jobs.status_open') },
    { key: 'FILLED',    label: t('jobs.status_filled') },
    { key: 'COMPLETED', label: t('jobs.status_completed') },
    { key: 'CANCELLED', label: t('jobs.status_cancelled') },
  ];

  const STATUS_LABEL: Record<JobStatus, string> = {
    OPEN: t('jobs.status_open_label'),
    FILLED: t('jobs.status_filled_label'),
    CANCELLED: t('jobs.status_cancelled_label'),
    COMPLETED: t('jobs.status_completed_label'),
  };

  const [allJobs, setAllJobs] = useState<ManagerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  const loadJobs = useCallback(async () => {
    try {
      const data = await api.get<ManagerJob[]>('/jobs/mine');
      setAllJobs(Array.isArray(data) ? data : []);
    } catch {
      setAllJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const filtered = activeTab === 'ALL' ? allJobs : allJobs.filter(j => j.status === activeTab);

  // Group by site
  const sections: SiteSection[] = Object.values(
    filtered.reduce<Record<string, SiteSection>>((acc, job) => {
      if (!acc[job.siteId]) {
        acc[job.siteId] = { siteId: job.siteId, siteName: job.siteName, data: [] };
      }
      acc[job.siteId].data.push(job);
      return acc;
    }, {}),
  );

  const counts: Record<TabKey, number> = {
    ALL: allJobs.length,
    OPEN: allJobs.filter(j => j.status === 'OPEN').length,
    FILLED: allJobs.filter(j => j.status === 'FILLED').length,
    COMPLETED: allJobs.filter(j => j.status === 'COMPLETED').length,
    CANCELLED: allJobs.filter(j => j.status === 'CANCELLED').length,
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Status filter tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {STATUS_TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {label}{counts[key] > 0 ? ` ${counts[key]}` : ''}
              </Text>
              {activeTab === key && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadJobs(); }}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{t('jobs.no_jobs')}</Text>
            <Text style={styles.hint}>{t('jobs.no_jobs_hint')}</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push({ pathname: '/(manager)/sites/[id]', params: { id: section.siteId } })}
            activeOpacity={0.7}
          >
            <View style={styles.siteIconBox}>
              <Text style={{ fontSize: 16 }}>🏗️</Text>
            </View>
            <Text style={styles.siteHeaderText} numberOfLines={1}>{section.siteName}</Text>
            <View style={styles.siteJobCount}>
              <Text style={styles.siteJobCountText}>{section.data.length}</Text>
            </View>
            <Text style={styles.siteArrow}>›</Text>
          </TouchableOpacity>
        )}
        renderItem={({ item }) => {
          const color = STATUS_COLOR[item.status] ?? Colors.onSurfaceVariant;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(manager)/jobs/[id]', params: { id: item.id } })}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.badgeText, { color }]}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardDate}>
                📅 {new Date(item.workDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.wage}>₫{new Intl.NumberFormat('ko-KR').format(item.dailyWage)}</Text>
                <Text style={styles.slots}>
                  {t('jobs.slots_count', { filled: item.slotsFilled, total: item.slotsTotal })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(manager)/jobs/create')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabsWrapper: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.outline },
  tabsContent: { paddingHorizontal: Spacing.sm, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 13, alignItems: 'center', position: 'relative' },
  tabActive: {},
  tabText: { ...Font.body3, color: Colors.onSurfaceVariant, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: 14, right: 14,
    height: 2, borderRadius: 1, backgroundColor: Colors.primary,
  },

  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 80 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    shadowColor: Colors.shadowBlack, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  siteIconBox: {
    width: 32, height: 32, borderRadius: Radius.xs,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  siteHeaderText: { flex: 1, ...Font.t4, color: Colors.onSurface },
  siteJobCount: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  siteJobCountText: { ...Font.caption, color: Colors.onPrimary, fontWeight: '700' },
  siteArrow: { fontSize: 18, color: Colors.onSurfaceVariant },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: 6,
    marginBottom: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.outline,
    shadowColor: Colors.shadowBlack, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flex: 1, ...Font.t4, color: Colors.onSurface, marginRight: 8 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { ...Font.caption, fontWeight: '700' },
  cardDate: { ...Font.caption, color: Colors.onSurfaceVariant },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wage: { ...Font.t4, color: Colors.primary },
  slots: { ...Font.caption, color: Colors.onSurfaceVariant },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant },
  hint: { ...Font.caption, color: Colors.disabled },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: Colors.onPrimary, fontSize: 28, lineHeight: 32 },
});
