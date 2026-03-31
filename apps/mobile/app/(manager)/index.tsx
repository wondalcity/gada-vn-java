import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api-client';
import type { JobWithSite } from '@gada-vn/core';

type JobStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED';

const STATUS_TABS: { key: JobStatus | 'ALL'; label: string }[] = [
  { key: 'ALL',       label: '전체' },
  { key: 'OPEN',      label: '모집중' },
  { key: 'FILLED',    label: '마감' },
  { key: 'COMPLETED', label: '완료' },
  { key: 'CANCELLED', label: '취소' },
];

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#4CAF50', FILLED: '#FF9800', CANCELLED: '#9E9E9E', COMPLETED: '#2196F3',
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: '모집 중', FILLED: '마감', CANCELLED: '취소됨', COMPLETED: '완료',
};

export default function ManagerJobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<JobStatus | 'ALL'>('ALL');

  const loadJobs = useCallback(async () => {
    try {
      const data = await api.get<JobWithSite[]>('/jobs/mine');
      setJobs(data);
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
            <Text style={styles.emptyText}>등록된 일자리가 없습니다</Text>
            <Text style={styles.hint}>아래 + 버튼으로 새 일자리를 등록하세요</Text>
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
                <Text style={styles.slots}>{item.slotsFilled}/{item.slotsTotal}명</Text>
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
