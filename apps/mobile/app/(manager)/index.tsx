import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import type { JobWithSite } from '@gada-vn/core';

type JobStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED';

// Demo data uses a flat shape — map siteName/tradeName to proper nested site
type DemoJob = Omit<JobWithSite, 'site' | 'workDate' | 'createdAt' | 'updatedAt' | 'managerId' | 'description' | 'tradeId' | 'startTime' | 'endTime' | 'slug' | 'publishedAt' | 'expiresAt' | 'imageS3Keys' | 'coverImageIdx'> & {
  siteName: string;
  tradeName: string;
  workDate: string;
  createdAt: string;
  updatedAt: string;
  imageUrls: string[];
  requirements: Record<string, unknown>;
  shiftCount: number;
  applicationCount: { pending: number; accepted: number; rejected: number };
};

const DEMO_JOBS: DemoJob[] = [
  { id: 'djob-1-1', siteId: 'demo-1', siteName: '하노이 스타레이크 시티 A동 신축', title: '철근 조립 — 10~12층 골조', tradeName: '철근', workDate: '2026-04-03', dailyWage: 650000, currency: 'VND', slotsTotal: 8, slotsFilled: 5, status: 'OPEN', benefits: { meals: true, transport: false, accommodation: false, insurance: true }, requirements: {}, imageUrls: [], shiftCount: 0, applicationCount: { pending: 4, accepted: 5, rejected: 1 }, createdAt: '2026-03-20T00:00:00Z', updatedAt: '2026-03-28T00:00:00Z' },
  { id: 'djob-1-2', siteId: 'demo-1', siteName: '하노이 스타레이크 시티 A동 신축', title: '콘크리트 타설 — 기초 슬라브', tradeName: '콘크리트', workDate: '2026-04-05', dailyWage: 580000, currency: 'VND', slotsTotal: 10, slotsFilled: 10, status: 'FILLED', benefits: { meals: true, transport: true, accommodation: false, insurance: false }, requirements: {}, imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 10, rejected: 3 }, createdAt: '2026-03-18T00:00:00Z', updatedAt: '2026-03-25T00:00:00Z' },
  { id: 'djob-2-1', siteId: 'demo-2', siteName: '호치민 빈홈즈 그랜드파크 상업동', title: '전기 배선 — 3~5층', tradeName: '전기', workDate: '2026-04-04', dailyWage: 720000, currency: 'VND', slotsTotal: 4, slotsFilled: 1, status: 'OPEN', benefits: { meals: true, transport: false, accommodation: false, insurance: true }, requirements: {}, imageUrls: [], shiftCount: 0, applicationCount: { pending: 3, accepted: 1, rejected: 0 }, createdAt: '2026-03-22T00:00:00Z', updatedAt: '2026-03-22T00:00:00Z' },
  { id: 'djob-3-2', siteId: 'demo-3', siteName: '다낭 선월드 케이블카 지지대 기초', title: '콘크리트 타설 — 철탑 기초 2차', tradeName: '콘크리트', workDate: '2026-04-02', dailyWage: 560000, currency: 'VND', slotsTotal: 8, slotsFilled: 3, status: 'OPEN', benefits: { meals: true, transport: true, accommodation: false, insurance: true }, requirements: {}, imageUrls: [], shiftCount: 0, applicationCount: { pending: 5, accepted: 3, rejected: 0 }, createdAt: '2026-03-28T00:00:00Z', updatedAt: '2026-03-28T00:00:00Z' },
];

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#4CAF50', FILLED: '#FF9800', CANCELLED: '#9E9E9E', COMPLETED: '#2196F3',
};

// STATUS_TABS and STATUS_LABEL are built inside the component to use t()


export default function ManagerJobsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [jobs, setJobs] = useState<DemoJob[]>([]);

  const STATUS_TABS: { key: JobStatus | 'ALL'; label: string }[] = [
    { key: 'ALL',       label: t('jobs.status_all') },
    { key: 'OPEN',      label: t('jobs.status_open') },
    { key: 'FILLED',    label: t('jobs.status_filled') },
    { key: 'COMPLETED', label: t('jobs.status_completed') },
    { key: 'CANCELLED', label: t('jobs.status_cancelled') },
  ];

  const STATUS_LABEL: Record<string, string> = {
    OPEN: t('jobs.status_open_label'), FILLED: t('jobs.status_filled_label'),
    CANCELLED: t('jobs.status_cancelled_label'), COMPLETED: t('jobs.status_completed_label'),
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<JobStatus | 'ALL'>('ALL');

  const loadJobs = useCallback(async () => {
    try {
      const data = await api.get<DemoJob[]>('/jobs/mine');
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const filtered = activeTab === 'ALL' ? jobs : jobs.filter(j => j.status === activeTab);

  const counts: Record<JobStatus | 'ALL', number> = {
    ALL: jobs.length,
    OPEN: jobs.filter(j => j.status === 'OPEN').length,
    FILLED: jobs.filter(j => j.status === 'FILLED').length,
    COMPLETED: jobs.filter(j => j.status === 'COMPLETED').length,
    CANCELLED: jobs.filter(j => j.status === 'CANCELLED').length,
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Status filter tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {STATUS_TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {label}
                {counts[key] > 0 && ` ${counts[key]}`}
              </Text>
              {activeTab === key && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadJobs(); }}
            colors={['#FF6B2C']}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('jobs.no_jobs')}</Text>
            <Text style={styles.hint}>{t('jobs.no_jobs_hint')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = STATUS_COLOR[item.status] ?? '#999';
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(manager)/jobs/[id]', params: { id: item.id } })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.badgeText, { color }]}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSite} numberOfLines={1}>{item.siteName}</Text>
              <Text style={styles.cardDate}>
                📅 {new Date(item.workDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.wage}>₫{new Intl.NumberFormat('ko-KR').format(item.dailyWage)}</Text>
                <Text style={styles.slots}>{t('jobs.slots_count', { filled: item.slotsFilled, total: item.slotsTotal })}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(manager)/jobs/create')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EFF1F5',
  },
  tabsContent: { paddingHorizontal: 12, gap: 4 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 13,
    alignItems: 'center', position: 'relative',
  },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '500', color: '#98A2B2' },
  tabTextActive: { color: '#FF6B2C', fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: 14, right: 14,
    height: 2, borderRadius: 1, backgroundColor: '#FF6B2C',
  },

  list: { padding: 16, gap: 12, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#999', fontSize: 15, marginBottom: 8 },
  hint: { color: '#bbb', fontSize: 13 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginRight: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  cardSite: { fontSize: 12, color: '#98A2B2' },
  cardDate: { fontSize: 13, color: '#666' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wage: { fontSize: 17, fontWeight: '700', color: '#FF6B2C' },
  slots: { fontSize: 13, color: '#888' },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF6B2C', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF6B2C', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
