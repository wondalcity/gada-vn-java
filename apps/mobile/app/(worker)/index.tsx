import { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, Text, StyleSheet,
  TouchableOpacity, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { ApiError } from '../../lib/api-client';
import { useJobStore } from '../../store/job.store';
import { api } from '../../lib/api-client';
import JobCard, { type JobCardItem } from '../../components/jobs/JobCard';
import JobsMapView from '../../components/jobs/JobsMapView';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';
import WorkerHeader from '../../components/WorkerHeader';
import { showToast } from '../../lib/toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

type ViewMode = 'list' | 'map';
type StatusFilter = '' | 'OPEN' | 'FILLED';

interface Trade { id: number; nameKo?: string; nameVi?: string; }
interface Province { code: string; id?: string; nameKo?: string; nameVi?: string; }

export default function WorkerJobFeed() {
  const { t, i18n } = useTranslation();
  const { jobs, setJobs } = useJobStore();
  // Read pre-applied filters from home screen navigation or header search
  const params = useLocalSearchParams<{ province?: string; tradeId?: string; q?: string; viewMode?: string; openFilter?: string }>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [focusJobId, setFocusJobId] = useState<string | null>(null);

  // Filter state (pending — inside modal)
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingTradeId, setPendingTradeId] = useState<number | null>(null);
  const [pendingProvince, setPendingProvince] = useState('');
  const [pendingStatus, setPendingStatus] = useState<StatusFilter>('');
  const [wageMin, setWageMin] = useState('');
  const [wageMax, setWageMax] = useState('');

  // Applied filters
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedTradeId, setAppliedTradeId] = useState<number | null>(null);
  const [appliedProvince, setAppliedProvince] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>('');
  const [appliedMin, setAppliedMin] = useState<number | null>(null);
  const [appliedMax, setAppliedMax] = useState<number | null>(null);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  // Apply pre-filters from home screen search — re-runs whenever params change
  useEffect(() => {
    const hasParams = params.province || params.tradeId || params.q || params.viewMode || params.openFilter;
    if (!hasParams) return;
    if (params.province !== undefined) setAppliedProvince(params.province);
    if (params.tradeId) setAppliedTradeId(Number(params.tradeId));
    if (params.q !== undefined) setAppliedSearch(params.q);
    if (params.viewMode === 'map') setViewMode('map');
    if (params.openFilter) {
      // Open filter modal when header search button was pressed
      setTimeout(() => openFilter(), 100);
    }
  // openFilter is defined below; safe to omit from deps since it only reads state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.province, params.tradeId, params.q, params.viewMode, params.openFilter]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const isFilterActive = !!(appliedSearch || appliedTradeId || appliedProvince || appliedStatus || appliedMin || appliedMax);
  const activeFilterCount = [appliedSearch, appliedTradeId, appliedProvince, appliedStatus, appliedMin ?? appliedMax].filter(Boolean).length;

  // Load reference data
  useEffect(() => {
    const locale = i18n.language === 'vi' ? 'vi' : 'ko';
    Promise.all([
      api.get<Trade[]>(`/public/trades?locale=${locale}`).catch(() => []),
      api.get<Province[]>(`/public/provinces?locale=${locale}`).catch(() => []),
    ]).then(([tr, pr]) => {
      setTrades(Array.isArray(tr) ? tr : []);
      setProvinces(Array.isArray(pr) ? pr : []);
    });
  }, [i18n.language]);

  const loadJobs = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pageNum,
        limit: 20,
        locale: i18n.language === 'vi' ? 'vi' : 'ko',
      };
      if (appliedSearch) params.q = appliedSearch;
      if (appliedTradeId) params.tradeId = appliedTradeId;
      if (appliedProvince) params.province = appliedProvince;
      if (appliedStatus) params.status = appliedStatus;
      if (appliedMin) params.minWage = appliedMin;
      if (appliedMax) params.maxWage = appliedMax;

      const { data: items, meta } = await api.getPaginated<JobCardItem>('/public/jobs', params);
      if (meta?.totalPages) setTotalPages(meta.totalPages);
      if (meta?.total) setTotalCount(meta.total);
      setPage(pageNum);
      setJobs(append ? [...jobs, ...items] : items);
    } catch (e) {
      if (!append) setJobs([]);
      if (!refreshing) {
        const msg = e instanceof ApiError ? e.message : t('jobs.load_fail', '일자리 목록을 불러오지 못했습니다');
        showToast({ message: msg, type: 'error' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedSearch, appliedTradeId, appliedProvince, appliedStatus, appliedMin, appliedMax, i18n.language]);

  useEffect(() => { loadJobs(1); }, [loadJobs]);

  function openFilter() {
    setPendingSearch(appliedSearch);
    setPendingTradeId(appliedTradeId);
    setPendingProvince(appliedProvince);
    setPendingStatus(appliedStatus);
    setWageMin(appliedMin ? String(appliedMin) : '');
    setWageMax(appliedMax ? String(appliedMax) : '');
    setShowFilterModal(true);
  }

  function applyFilter() {
    setAppliedSearch(pendingSearch.trim());
    setAppliedTradeId(pendingTradeId);
    setAppliedProvince(pendingProvince);
    setAppliedStatus(pendingStatus);
    const min = wageMin ? parseInt(wageMin.replace(/,/g, ''), 10) : null;
    const max = wageMax ? parseInt(wageMax.replace(/,/g, ''), 10) : null;
    setAppliedMin(isNaN(min as number) ? null : min);
    setAppliedMax(isNaN(max as number) ? null : max);
    setShowFilterModal(false);
  }

  function resetFilter() {
    setPendingSearch('');
    setPendingTradeId(null);
    setPendingProvince('');
    setPendingStatus('');
    setWageMin('');
    setWageMax('');
  }

  function clearAllFilters() {
    setAppliedSearch('');
    setAppliedTradeId(null);
    setAppliedProvince('');
    setAppliedStatus('');
    setAppliedMin(null);
    setAppliedMax(null);
  }

  const statusOptions: { value: StatusFilter; label: string; dotColor: string; bg: string; textColor: string }[] = [
    { value: '', label: t('common.all'), dotColor: Colors.disabled, bg: Colors.surfaceContainer, textColor: Colors.onSurfaceVariant },
    { value: 'OPEN', label: t('jobs.status_open_label'), dotColor: Colors.success, bg: '#E8FBE8', textColor: '#1A6B1A' },
    { value: 'FILLED', label: t('jobs.closed_label'), dotColor: Colors.disabled, bg: Colors.surfaceContainer, textColor: Colors.onSurfaceVariant },
  ];

  return (
    <View style={styles.container}>
      {/* Custom header replaces native Tabs header */}
      <WorkerHeader />

      {/* ── Top bar: job count + filter + view toggle ── */}
      <View style={styles.topBar}>
        <Text style={styles.jobCount}>
          {loading ? t('common.loading') : t('jobs.job_count', { count: totalCount > 0 ? totalCount : (jobs?.length ?? 0) })}
        </Text>

        <View style={styles.topBarRight}>
          {/* Filter button */}
          <TouchableOpacity
            style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]}
            onPress={openFilter}
            activeOpacity={0.8}
          >
            <View style={styles.filterLines}>
              {[16, 12, 8].map((w, i) => (
                <View key={i} style={[styles.filterLine, { width: w }, isFilterActive && styles.filterLineActive]} />
              ))}
            </View>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* View toggle */}
          <View style={styles.viewToggleGroup}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
            >
              <View style={styles.listIcon}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[styles.listIconLine, viewMode === 'list' && styles.listIconLineActive]} />
                ))}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('map')}
              activeOpacity={0.8}
            >
              <View style={[styles.mapPin, viewMode === 'map' && styles.mapPinActive]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Active filter chips */}
      {isFilterActive && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFilterBar}
          contentContainerStyle={styles.activeFilterContent}
        >
          {appliedSearch ? (
            <View style={styles.activeChip}><Text style={styles.activeChipText}>"{appliedSearch}"</Text></View>
          ) : null}
          {appliedProvince ? (() => {
            const p = provinces.find(pr => (pr.code ?? pr.id) === appliedProvince);
            return (
              <View style={styles.activeChip}><Text style={styles.activeChipText}>
                {p?.nameKo || p?.nameVi || appliedProvince}
              </Text></View>
            );
          })() : null}
          {appliedTradeId ? (() => {
            const tr = trades.find(t => t.id === appliedTradeId);
            return (
              <View style={styles.activeChip}><Text style={styles.activeChipText}>
                {tr?.nameKo || tr?.nameVi || String(appliedTradeId)}
              </Text></View>
            );
          })() : null}
          {appliedStatus ? (
            <View style={styles.activeChip}><Text style={styles.activeChipText}>
              {statusOptions.find(s => s.value === appliedStatus)?.label}
            </Text></View>
          ) : null}
          {(appliedMin || appliedMax) ? (
            <View style={styles.activeChip}><Text style={styles.activeChipText}>
              {appliedMin && appliedMax
                ? `₫${(appliedMin / 1000).toFixed(0)}K–₫${(appliedMax / 1000).toFixed(0)}K`
                : appliedMin ? `₫${(appliedMin / 1000).toFixed(0)}K+`
                : `~₫${(appliedMax! / 1000).toFixed(0)}K`}
            </Text></View>
          ) : null}
          <TouchableOpacity style={styles.clearAllBtn} onPress={clearAllFilters}>
            <Text style={styles.clearAllText}>{t('jobs.filter_clear_chips')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Content */}
      {viewMode === 'list' ? (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={{ width: CARD_WIDTH }}>
              <JobCard job={item} />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadJobs(1); }}
              colors={[Colors.primary]}
            />
          }
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (!loading && page < totalPages) loadJobs(page + 1, true);
          }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>
                  {isFilterActive ? t('jobs.no_jobs_filtered') : t('jobs.no_jobs_today')}
                </Text>
                {isFilterActive && (
                  <TouchableOpacity style={styles.clearEmptyBtn} onPress={clearAllFilters}>
                    <Text style={styles.clearEmptyText}>{t('jobs.filter_clear_all')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      ) : (
        <JobsMapView
          jobs={jobs}
          focusJobId={focusJobId}
          onFocused={() => setFocusJobId(null)}
        />
      )}

      {/* ── Filter Modal ── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={styles.filterSheet}
              contentContainerStyle={styles.filterSheetContent}
              onStartShouldSetResponder={() => true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHandle} />
              <Text style={styles.filterTitle}>{t('jobs.filter_title')}</Text>

              {/* Search */}
              <Text style={styles.filterLabel}>{t('jobs.filter_search')}</Text>
              <TextInput
                style={styles.filterInput}
                value={pendingSearch}
                onChangeText={setPendingSearch}
                placeholder={t('jobs.filter_name_placeholder')}
                placeholderTextColor={Colors.disabled}
                returnKeyType="search"
              />

              {/* Status */}
              <Text style={styles.filterLabel}>{t('jobs.filter_status_label')}</Text>
              <View style={styles.statusRow}>
                {statusOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.statusBtn,
                      pendingStatus === opt.value && styles.statusBtnActive,
                    ]}
                    onPress={() => setPendingStatus(opt.value)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusDot, { backgroundColor: opt.dotColor }]} />
                    <Text style={[
                      styles.statusBtnText,
                      pendingStatus === opt.value && styles.statusBtnTextActive,
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Province */}
              <Text style={styles.filterLabel}>{t('jobs.filter_province')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, !pendingProvince && styles.chipActive]}
                    onPress={() => setPendingProvince('')}
                  >
                    <Text style={[styles.chipText, !pendingProvince && styles.chipTextActive]}>{t('common.all')}</Text>
                  </TouchableOpacity>
                  {provinces.map(p => {
                    const pKey = p.code ?? p.id ?? '';
                    return (
                      <TouchableOpacity
                        key={pKey}
                        style={[styles.chip, pendingProvince === pKey && styles.chipActive]}
                        onPress={() => setPendingProvince(pendingProvince === pKey ? '' : pKey)}
                      >
                        <Text style={[styles.chipText, pendingProvince === pKey && styles.chipTextActive]}>
                          {p.nameKo || p.nameVi || p.code}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Trade */}
              <Text style={styles.filterLabel}>{t('jobs.filter_trade')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, !pendingTradeId && styles.chipActive]}
                    onPress={() => setPendingTradeId(null)}
                  >
                    <Text style={[styles.chipText, !pendingTradeId && styles.chipTextActive]}>{t('common.all')}</Text>
                  </TouchableOpacity>
                  {trades.map(tr => (
                    <TouchableOpacity
                      key={tr.id}
                      style={[styles.chip, pendingTradeId === tr.id && styles.chipActive]}
                      onPress={() => setPendingTradeId(pendingTradeId === tr.id ? null : tr.id)}
                    >
                      <Text style={[styles.chipText, pendingTradeId === tr.id && styles.chipTextActive]}>
                        {tr.nameKo || tr.nameVi || String(tr.id)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Wage */}
              <Text style={styles.filterLabel}>{t('jobs.filter_wage_range')}</Text>
              <View style={styles.wageRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wageSubLabel}>{t('jobs.filter_wage_min_label')}</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={wageMin}
                    onChangeText={setWageMin}
                    placeholder="0"
                    placeholderTextColor={Colors.disabled}
                    keyboardType="number-pad"
                  />
                </View>
                <Text style={styles.wageDash}>–</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wageSubLabel}>{t('jobs.filter_wage_max_label')}</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={wageMax}
                    onChangeText={setWageMax}
                    placeholder={t('jobs.filter_wage_no_max')}
                    placeholderTextColor={Colors.disabled}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Actions */}
              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilter}>
                  <Text style={styles.resetBtnText}>{t('jobs.wage_filter_reset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
                  <Text style={styles.applyBtnText}>{t('jobs.filter_apply')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outline, paddingHorizontal: 16, paddingVertical: 10,
  },
  jobCount: { ...Font.body3, color: Colors.onSurfaceVariant, fontWeight: '500' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Filter button
  filterBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: { backgroundColor: 'rgba(6,105,247,0.08)', borderWidth: 1, borderColor: Colors.primary },
  filterLines: { gap: 3, alignItems: 'center' },
  filterLine: { height: 2, borderRadius: 1, backgroundColor: Colors.disabled },
  filterLineActive: { backgroundColor: Colors.primary },
  filterBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // View toggle
  viewToggleGroup: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainer,
    borderRadius: 10, padding: 2, gap: 2,
  },
  viewToggleBtn: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  viewToggleBtnActive: { backgroundColor: Colors.surface },
  listIcon: { gap: 3 },
  listIconLine: { width: 16, height: 2, borderRadius: 1, backgroundColor: Colors.disabled },
  listIconLineActive: { backgroundColor: Colors.onSurface },
  mapPin: { width: 10, height: 14, borderRadius: 5, borderWidth: 2, borderColor: Colors.disabled },
  mapPinActive: { borderColor: Colors.onSurface },

  // Active filter bar
  activeFilterBar: {
    backgroundColor: 'rgba(6,105,247,0.06)', maxHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.outline,
  },
  activeFilterContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, flexDirection: 'row', alignItems: 'center' },
  activeChip: {
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.primary,
  },
  activeChipText: { ...Font.caption, color: Colors.primary, fontWeight: '600' },
  clearAllBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  clearAllText: { ...Font.caption, color: Colors.primary, fontWeight: '700' },

  // List
  list: { padding: 16, paddingBottom: 32 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 },
  clearEmptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Colors.primary },
  clearEmptyText: { ...Font.t4, color: '#fff', fontWeight: '700' },

  // Filter modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay30, justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  filterSheetContent: { padding: 16, paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.outline, alignSelf: 'center', marginBottom: 12 },
  filterTitle: { ...Font.t3, color: Colors.onSurface, textAlign: 'center', marginBottom: 16 },
  filterLabel: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  filterInput: {
    borderWidth: 1.5, borderColor: Colors.outline, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10,
    ...Font.body3, color: Colors.onSurface, backgroundColor: Colors.surface,
  },

  // Status
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 4,
    borderWidth: 1.5, borderColor: Colors.outline, backgroundColor: Colors.surface,
  },
  statusBtnActive: { borderColor: Colors.primary, backgroundColor: 'rgba(6,105,247,0.06)' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBtnText: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  statusBtnTextActive: { color: Colors.primary },

  // Chips
  chipRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.pill, borderWidth: 1,
    borderColor: Colors.outline, backgroundColor: Colors.surfaceContainer,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Wage range
  wageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  wageSubLabel: { ...Font.caption, color: Colors.onSurfaceVariant, marginBottom: 4 },
  wageDash: { ...Font.body2, color: Colors.disabled, marginBottom: 10 },

  // Actions
  filterActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  resetBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.outline, alignItems: 'center',
  },
  resetBtnText: { ...Font.t4, color: Colors.onSurfaceVariant, fontWeight: '600' },
  applyBtn: {
    flex: 2, paddingVertical: 14, borderRadius: Radius.pill,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  applyBtnText: { ...Font.t4, color: '#fff', fontWeight: '700' },
});
