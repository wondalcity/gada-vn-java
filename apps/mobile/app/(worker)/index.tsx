import { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, Text, StyleSheet,
  ScrollView, TouchableOpacity, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
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
  const { t, i18n } = useTranslation();
  const { selectedDate, setSelectedDate, jobs, setJobs } = useJobStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [focusJobId, setFocusJobId] = useState<string | null>(null);

  // Wage filter state
  const [showWageFilter, setShowWageFilter] = useState(false);
  const [wageMinInput, setWageMinInput] = useState('');
  const [wageMaxInput, setWageMaxInput] = useState('');
  const [appliedMin, setAppliedMin] = useState<number | null>(null);
  const [appliedMax, setAppliedMax] = useState<number | null>(null);

  const isFilterActive = appliedMin !== null || appliedMax !== null;

  const dates = getDatesAround(selectedDate);

  function applyWageFilter() {
    const min = wageMinInput ? parseInt(wageMinInput.replace(/,/g, ''), 10) : null;
    const max = wageMaxInput ? parseInt(wageMaxInput.replace(/,/g, ''), 10) : null;
    setAppliedMin(isNaN(min as number) ? null : min);
    setAppliedMax(isNaN(max as number) ? null : max);
    setShowWageFilter(false);
  }

  function resetWageFilter() {
    setWageMinInput('');
    setWageMaxInput('');
    setAppliedMin(null);
    setAppliedMax(null);
    setShowWageFilter(false);
  }

  const filteredJobs = jobs.filter((job) => {
    if (appliedMin !== null && job.dailyWage < appliedMin) return false;
    if (appliedMax !== null && job.dailyWage > appliedMax) return false;
    return true;
  });

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
    const { language } = i18n;
    if (dateStr === today) {
      return t('jobs.today');
    }
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (language === 'ko') {
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      return `${month}월 ${day}일(${days[date.getDay()]})`;
    }
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${String(day).padStart(2,'0')}.${MONTHS[date.getMonth()]}`;
  }

  return (
    <View style={styles.container}>
      {/* ── Top bar: date slider + filter + view toggle ── */}
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

        {/* Wage filter button + List / Map toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, isFilterActive && styles.toggleBtnFilterActive]}
            onPress={() => {
              setWageMinInput(appliedMin ? String(appliedMin) : '');
              setWageMaxInput(appliedMax ? String(appliedMax) : '');
              setShowWageFilter(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.toggleIcon}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[
                  styles.filterIconLine,
                  { width: 16 - i * 4 },
                  isFilterActive && styles.filterIconLineActive,
                ]} />
              ))}
            </View>
          </TouchableOpacity>
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

      {/* ── Active filter indicator ── */}
      {isFilterActive && (
        <TouchableOpacity style={styles.filterBadge} onPress={resetWageFilter} activeOpacity={0.8}>
          <Text style={styles.filterBadgeText}>
            {appliedMin && appliedMax
              ? `₫${(appliedMin / 1000).toFixed(0)}K – ₫${(appliedMax / 1000).toFixed(0)}K`
              : appliedMin
              ? `₫${(appliedMin / 1000).toFixed(0)}K 이상`
              : `₫${(appliedMax! / 1000).toFixed(0)}K 이하`}
          </Text>
          <Text style={styles.filterBadgeClear}>✕</Text>
        </TouchableOpacity>
      )}

      {/* ── Content ── */}
      {viewMode === 'list' ? (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onWagePress={() => {
                setFocusJobId(item.id);
                setViewMode('map');
              }}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadJobs} colors={['#FF6B2C']} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('jobs.no_jobs_today')}</Text>
            </View>
          }
        />
      ) : (
        <JobsMapView
          jobs={filteredJobs}
          focusJobId={focusJobId}
          onFocused={() => setFocusJobId(null)}
        />
      )}

      {/* ── Wage Filter Modal ── */}
      <Modal
        visible={showWageFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWageFilter(false)}
      >
        <TouchableOpacity
          style={styles.filterOverlay}
          activeOpacity={1}
          onPress={() => setShowWageFilter(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.filterSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.filterSheetTitle}>{t('jobs.wage_filter_title')}</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterInputWrap}>
                  <Text style={styles.filterInputLabel}>{t('jobs.wage_filter_min')}</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={wageMinInput}
                    onChangeText={setWageMinInput}
                    placeholder={t('jobs.wage_filter_placeholder')}
                    placeholderTextColor="#B2B2B2"
                    keyboardType="number-pad"
                  />
                </View>
                <Text style={styles.filterSep}>–</Text>
                <View style={styles.filterInputWrap}>
                  <Text style={styles.filterInputLabel}>{t('jobs.wage_filter_max')}</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={wageMaxInput}
                    onChangeText={setWageMaxInput}
                    placeholder={t('jobs.wage_filter_placeholder')}
                    placeholderTextColor="#B2B2B2"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.filterResetBtn} onPress={resetWageFilter}>
                  <Text style={styles.filterResetText}>{t('jobs.wage_filter_reset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterApplyBtn} onPress={applyWageFilter}>
                  <Text style={styles.filterApplyText}>{t('jobs.wage_filter_apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
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

  // Filter button active state
  toggleBtnFilterActive: { backgroundColor: '#FFF0EB' },

  // Filter icon (funnel shape via 3 lines of decreasing width)
  filterIconLine: {
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#B2B2B2',
  },
  filterIconLineActive: { backgroundColor: '#FF6B2C' },

  // Active filter badge
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FFD4C2',
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 6,
  },
  filterBadgeText: { fontSize: 12, color: '#FF6B2C', fontWeight: '600', flex: 1 },
  filterBadgeClear: { fontSize: 13, color: '#FF6B2C', fontWeight: '700' },

  // Filter bottom sheet
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  filterSheetTitle: { fontSize: 16, fontWeight: '700', color: '#25282A', textAlign: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  filterInputWrap: { flex: 1, gap: 4 },
  filterInputLabel: { fontSize: 12, color: '#777', fontWeight: '500' },
  filterInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#25282A',
  },
  filterSep: { fontSize: 18, color: '#B2B2B2', marginBottom: 10 },
  filterActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  filterResetBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center',
  },
  filterResetText: { fontSize: 14, fontWeight: '600', color: '#666' },
  filterApplyBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#FF6B2C', alignItems: 'center',
  },
  filterApplyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
