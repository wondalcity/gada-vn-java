import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api-client';
import type { JobWithSite } from '@gada-vn/core';

function statusLabel(status: string) {
  const map: Record<string, string> = {
    OPEN: '모집 중', FILLED: '마감', CANCELLED: '취소됨', COMPLETED: '완료',
  };
  return map[status] ?? status;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    OPEN: '#4CAF50', FILLED: '#FF9800', CANCELLED: '#9E9E9E', COMPLETED: '#2196F3',
  };
  return map[status] ?? '#999';
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithSite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      const data = await api.get<JobWithSite[]>('/jobs/mine');
      setJobs(data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadJobs} colors={['#FF6B2C']} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.header}>내 일자리 ({jobs.length}건)</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>등록된 일자리가 없습니다</Text>
            <Text style={styles.hint}>아래 + 버튼으로 새 일자리를 등록하세요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/(manager)/jobs/[id]', params: { id: item.id } })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
                <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.cardDate}>
              📅 {new Date(item.workDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.wage}>₫{item.dailyWage.toLocaleString()}</Text>
              <Text style={styles.slots}>{item.slotsFilled}/{item.slotsTotal}명</Text>
            </View>
          </TouchableOpacity>
        )}
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
  list: { padding: 16, gap: 12, paddingBottom: 80 },
  header: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#999', fontSize: 15, marginBottom: 8 },
  hint: { color: '#bbb', fontSize: 13 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginRight: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
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
