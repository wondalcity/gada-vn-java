import { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, Text, StyleSheet,
  ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useJobStore } from '../../store/job.store';
import { api } from '../../lib/api-client';
import type { JobWithSite } from '@gada-vn/core';
import JobCard from '../../components/jobs/JobCard';

function getDatesAround(centerDate: string, count = 7): string[] {
  const center = new Date(centerDate);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(center);
    d.setDate(center.getDate() + i - Math.floor(count / 2));
    return d.toISOString().split('T')[0];
  });
}

export default function WorkerJobFeed() {
  const { t } = useTranslation();
  const { selectedDate, setSelectedDate, jobs, setJobs } = useJobStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dates = getDatesAround(selectedDate);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<JobWithSite[]>('/jobs/date/' + selectedDate, { limit: 20 });
      setJobs(data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayLabel = days[date.getDay()];
    if (dateStr === today) return `오늘(${dayLabel})`;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}(${dayLabel})`;
  }

  return (
    <View style={styles.container}>
      {/* Date slider */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateBar}
        contentContainerStyle={styles.dateBarContent}
      >
        {dates.map((date) => (
          <TouchableOpacity
            key={date}
            style={[styles.dateChip, date === selectedDate && styles.dateChipActive]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={[styles.dateChipText, date === selectedDate && styles.dateChipTextActive]}>
              {formatDateLabel(date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Job list */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadJobs} colors={['#FF6B2C']} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>이 날의 일자리가 없습니다</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  dateBar: { backgroundColor: '#fff', maxHeight: 56 },
  dateBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  dateChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F0F0F0', alignItems: 'center',
  },
  dateChipActive: { backgroundColor: '#FF6B2C' },
  dateChipText: { fontSize: 13, color: '#555' },
  dateChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 15 },
});
