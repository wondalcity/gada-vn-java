import { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, Text, StyleSheet,
  ScrollView, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api-client';
import { useJobStore } from '../../store/job.store';
import { api } from '../../lib/api-client';
import type { JobWithSite } from '@gada-vn/core';
import JobCard from '../../components/jobs/JobCard';
import JobsMapView from '../../components/jobs/JobsMapView';

type ViewMode = 'list' | 'map';

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const dates = getDatesAround(selectedDate);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<JobWithSite[]>('/jobs/date/' + selectedDate, { limit: 20 });
      setJobs(data);
    } catch (e) {
      setJobs([]);
      if (!refreshing) {
        const msg = e instanceof ApiError ? e.message : t('jobs.load_fail');
        Alert.alert(t('common.error'), msg, [{ text: t('common.confirm') }]);
      }
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
    if (dateStr === today) return `${t('jobs.today')}(${dayLabel})`;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}(${dayLabel})`;
  }

  return (
    <View style={styles.container}>
      {/* ── Top bar: date slider + view toggle ── */}
      <View style={styles.topBar}>
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

        {/* List / Map toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            {/* List icon */}
            <View style={styles.toggleIcon}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[
                  styles.listIconLine,
                  viewMode === 'list' && styles.listIconLineActive,
                ]} />
              ))}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.8}
          >
            {/* Map pin icon */}
            <View style={styles.toggleIcon}>
              <View style={[styles.mapIconPin, viewMode === 'map' && styles.mapIconPinActive]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      {viewMode === 'list' ? (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <JobCard job={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadJobs} colors={['#FF6B2C']} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('jobs.no_jobs_today')}</Text>
            </View>
          }
        />
      ) : (
        <JobsMapView jobs={jobs} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  dateBar: { flex: 1, maxHeight: 56 },
  dateBarContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  dateChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F0F0F0', alignItems: 'center',
  },
  dateChipActive: { backgroundColor: '#FF6B2C' },
  dateChipText: { fontSize: 13, color: '#555' },
  dateChipTextActive: { color: '#fff', fontWeight: '600' },

  // View toggle
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingRight: 12,
    paddingLeft: 4,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#FFF0EB',
  },
  toggleIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  // List icon lines
  listIconLine: {
    width: 16,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#B2B2B2',
  },
  listIconLineActive: { backgroundColor: '#FF6B2C' },

  // Map pin icon (simplified)
  mapIconPin: {
    width: 12,
    height: 16,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#B2B2B2',
    backgroundColor: 'transparent',
  },
  mapIconPinActive: { borderColor: '#FF6B2C' },

  // List styles
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 15 },
});
