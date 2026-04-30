import { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, Text, StyleSheet,
  TouchableOpacity, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { ApiError } from '../../lib/api-client';
import { useJobStore } from '../../store/job.store';
import { api } from '../../lib/api-client';
import JobCard, { type JobCardItem } from '../../components/jobs/JobCard';
import JobsMapView from '../../components/jobs/JobsMapView';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';
import AppHeader from '../../components/AppHeader';
import { showToast } from '../../lib/toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

type ViewMode = 'list' | 'map';
// '' = default (shows open jobs), 'CLOSING_SOON', 'CLOSED' map to API statusFilter param
type StatusFilter = '' | 'CLOSING_SOON' | 'CLOSED';
type MinExp = '' | 'none' | 'lt1' | '1to2' | '2to3' | 'gte3';

interface Trade { id: number; nameKo?: string; nameVi?: string; }
interface Province { code: string; id?: string; nameKo?: string; nameVi?: string; }

const RADIUS_OPTIONS = [10, 30, 50, 100] as const;
type RadiusKm = typeof RADIUS_OPTIONS[number];

export default function WorkerJobFeed() {
  const { t, i18n } = useTranslation();
  const { jobs, setJobs } = useJobStore();
  const insets = useSafeAreaInsets();
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
  const [pendingMinExp, setPendingMinExp] = useState<MinExp>('');
  const [wageMin, setWageMin] = useState('');
  const [wageMax, setWageMax] = useState('');
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [pendingRadius, setPendingRadius] = useState<RadiusKm>(30);
  const [locLoading, setLocLoading] = useState(false);

  // Applied filters
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedTradeId, setAppliedTradeId] = useState<number | null>(null);
  const [appliedProvince, setAppliedProvince] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>('');
  const [appliedMinExp, setAppliedMinExp] = useState<MinExp>('');
  const [appliedMin, setAppliedMin] = useState<number | null>(null);
  const [appliedMax, setAppliedMax] = useState<number | null>(null);
  const [appliedLat, setAppliedLat] = useState<number | null>(null);
  const [appliedLng, setAppliedLng] = useState<number | null>(null);
  const [appliedRadius, setAppliedRadius] = useState<RadiusKm>(30);

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

  const isFilterActive = !!(appliedSearch || appliedTradeId || appliedProvince || appliedStatus || appliedMinExp || appliedMin || appliedMax || appliedLat);
  const activeFilterCount = [appliedSearch, appliedTradeId, appliedProvince, appliedStatus, appliedMinExp, appliedMin ?? appliedMax, appliedLat].filter(Boolean).length;

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
      const queryParams: Record<string, string | number> = {
        page: pageNum,
        limit: 20,
        locale: i18n.language === 'vi' ? 'vi' : 'ko',
      };
      if (appliedSearch) queryParams.q = appliedSearch;
      if (appliedTradeId) queryParams.tradeId = appliedTradeId;
      if (appliedProvince) queryParams.province = appliedProvince;
      // statusFilter maps to API's statusFilter param (CLOSING_SOON / CLOSED)
      if (appliedStatus) queryParams.statusFilter = appliedStatus;
      if (appliedMin) queryParams.minWage = appliedMin;
      if (appliedMax) queryParams.maxWage = appliedMax;
      if (appliedLat != null && appliedLng != null) {
        queryParams.lat = appliedLat;
        queryParams.lng = appliedLng;
        queryParams.radiusKm = appliedRadius;
      }

      const { data: items, meta } = await api.getPaginated<JobCardItem>('/public/jobs', queryParams);
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
  }, [appliedSearch, appliedTradeId, appliedProvince, appliedStatus, appliedMin, appliedMax, appliedLat, appliedLng, appliedRadius, i18n.language]);

  useEffect(() => { loadJobs(1); }, [loadJobs]);

  function openFilter() {
    setPendingSearch(appliedSearch);
    setPendingTradeId(appliedTradeId);
    setPendingProvince(appliedProvince);
    setPendingStatus(appliedStatus);
    setPendingMinExp(appliedMinExp);
    setWageMin(appliedMin ? String(appliedMin) : '');
    setWageMax(appliedMax ? String(appliedMax) : '');
    setPendingLat(appliedLat);
    setPendingLng(appliedLng);
    setPendingRadius(appliedRadius);
    setShowRegionPicker(false);
    setShowTradePicker(false);
    setShowFilterModal(true);
  }

  function applyFilter() {
    setAppliedSearch(pendingSearch.trim());
    setAppliedTradeId(pendingTradeId);
    setAppliedProvince(pendingProvince);
    setAppliedStatus(pendingStatus);
    setAppliedMinExp(pendingMinExp);
    const min = wageMin ? parseInt(wageMin.replace(/,/g, ''), 10) : null;
    const max = wageMax ? parseInt(wageMax.replace(/,/g, ''), 10) : null;
    setAppliedMin(isNaN(min as number) ? null : min);
    setAppliedMax(isNaN(max as number) ? null : max);
    setAppliedLat(pendingLat);
    setAppliedLng(pendingLng);
    setAppliedRadius(pendingRadius);
    setShowRegionPicker(false);
    setShowTradePicker(false);
    setShowFilterModal(false);
  }

  function resetFilter() {
    setPendingSearch('');
    setPendingTradeId(null);
    setPendingProvince('');
    setPendingStatus('');
    setPendingMinExp('');
    setWageMin('');
    setWageMax('');
    setPendingLat(null);
    setPendingLng(null);
    setPendingRadius(30);
  }

  function clearAllFilters() {
    setAppliedSearch('');
    setAppliedTradeId(null);
    setAppliedProvince('');
    setAppliedStatus('');
    setAppliedMinExp('');
    setAppliedMin(null);
    setAppliedMax(null);
    setAppliedLat(null);
    setAppliedLng(null);
    setAppliedRadius(30);
  }

  async function handleUseCurrentLocation() {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast({ message: t('jobs.location_permission_denied', '위치 권한이 필요합니다'), type: 'error' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPendingLat(loc.coords.latitude);
      setPendingLng(loc.coords.longitude);
    } catch {
      showToast({ message: t('jobs.location_fail', '위치를 가져오지 못했습니다'), type: 'error' });
    } finally {
      setLocLoading(false);
    }
  }

  // Status options matching web app (Open = default/no filter, Closing Soon, Closed)
  const statusOptions: { value: StatusFilter; label: string; dotColor: string }[] = [
    { value: '', label: t('jobs.status_open_label', '모집중'), dotColor: Colors.success },
    { value: 'CLOSING_SOON', label: t('jobs.status_closing_soon', '마감임박'), dotColor: Colors.secondary },
    { value: 'CLOSED', label: t('jobs.closed_label', '마감'), dotColor: Colors.disabled },
  ];

  // Experience options matching web app
  const expOptions: { value: MinExp; label: string }[] = [
    { value: '', label: t('common.all', '전체') },
    { value: 'none', label: t('jobs.exp_none', '무관') },
    { value: 'lt1', label: t('jobs.exp_lt1', '1년 미만') },
    { value: '1to2', label: t('jobs.exp_1to2', '1~2년') },
    { value: '2to3', label: t('jobs.exp_2to3', '2~3년') },
    { value: 'gte3', label: t('jobs.exp_gte3', '3년 이상') },
  ];

  // Sub-picker state for region / trade dropdowns inside search modal
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showTradePicker, setShowTradePicker] = useState(false);

  return (
    <View style={styles.container}>
      {/* Custom header replaces native Tabs header */}
      <AppHeader searchPath="/(worker)/" />

      {/* Active filter chips — shown at top when any filter is active */}
      {isFilterActive && (
        <View style={styles.activeFilterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
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
            {appliedMinExp ? (
              <View style={styles.activeChip}><Text style={styles.activeChipText}>
                {expOptions.find(e => e.value === appliedMinExp)?.label}
              </Text></View>
            ) : null}
            {appliedLat != null ? (
              <View style={styles.activeChip}><Text style={styles.activeChipText}>
                📍 {appliedRadius}km
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
        </View>
      )}

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
              <Text style={[styles.viewToggleBtnText, viewMode === 'list' && styles.viewToggleBtnTextActive]}>
                목록
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('map')}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewToggleBtnText, viewMode === 'map' && styles.viewToggleBtnTextActive]}>
                지도
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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

      {/* ── Search Modal (웹앱과 동일한 UI) ── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.searchOverlayBackdrop}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={[styles.searchPanel, { paddingTop: insets.top + 8 }]}>
                {/* 공고명 / 현장명 검색 */}
                <View style={styles.searchInputRow}>
                  <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInputField}
                    value={pendingSearch}
                    onChangeText={setPendingSearch}
                    placeholder={t('jobs.filter_name_placeholder', '공고명 또는 현장명 검색...')}
                    placeholderTextColor={Colors.disabled}
                    returnKeyType="search"
                    onSubmitEditing={applyFilter}
                    autoFocus
                  />
                  {pendingSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setPendingSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={Colors.disabled} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 지역 선택 */}
                <TouchableOpacity
                  style={styles.dropdownRow}
                  onPress={() => { setShowRegionPicker(true); setShowTradePicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownLabel, pendingProvince ? styles.dropdownLabelActive : undefined]}>
                    {pendingProvince
                      ? (provinces.find(p => (p.code ?? p.id) === pendingProvince)?.nameKo
                          || provinces.find(p => (p.code ?? p.id) === pendingProvince)?.nameVi
                          || pendingProvince)
                      : t('jobs.filter_province', '전체 지역')}
                  </Text>
                  <Ionicons
                    name={showRegionPicker ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={pendingProvince ? Colors.primary : Colors.onSurfaceVariant}
                  />
                </TouchableOpacity>

                {showRegionPicker && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pickerScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={styles.chipRow}>
                      <TouchableOpacity
                        style={[styles.chip, !pendingProvince && styles.chipActive]}
                        onPress={() => { setPendingProvince(''); setShowRegionPicker(false); }}
                      >
                        <Text style={[styles.chipText, !pendingProvince && styles.chipTextActive]}>
                          {t('common.all', '전체')}
                        </Text>
                      </TouchableOpacity>
                      {provinces.map(p => {
                        const pKey = p.code ?? p.id ?? '';
                        const isActive = pendingProvince === pKey;
                        return (
                          <TouchableOpacity
                            key={pKey}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => { setPendingProvince(isActive ? '' : pKey); setShowRegionPicker(false); }}
                          >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                              {p.nameKo || p.nameVi || p.code}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}

                {/* 직종 선택 */}
                <TouchableOpacity
                  style={styles.dropdownRow}
                  onPress={() => { setShowTradePicker(true); setShowRegionPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownLabel, pendingTradeId != null && styles.dropdownLabelActive]}>
                    {pendingTradeId != null
                      ? (trades.find(tr => tr.id === pendingTradeId)?.nameKo
                          || trades.find(tr => tr.id === pendingTradeId)?.nameVi
                          || String(pendingTradeId))
                      : t('jobs.filter_trade', '전체 직종')}
                  </Text>
                  <Ionicons
                    name={showTradePicker ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={pendingTradeId != null ? Colors.primary : Colors.onSurfaceVariant}
                  />
                </TouchableOpacity>

                {showTradePicker && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pickerScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={styles.chipRow}>
                      <TouchableOpacity
                        style={[styles.chip, pendingTradeId == null && styles.chipActive]}
                        onPress={() => { setPendingTradeId(null); setShowTradePicker(false); }}
                      >
                        <Text style={[styles.chipText, pendingTradeId == null && styles.chipTextActive]}>
                          {t('common.all', '전체')}
                        </Text>
                      </TouchableOpacity>
                      {trades.map(tr => {
                        const isActive = pendingTradeId === tr.id;
                        return (
                          <TouchableOpacity
                            key={tr.id}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => { setPendingTradeId(isActive ? null : tr.id); setShowTradePicker(false); }}
                          >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                              {tr.nameKo || tr.nameVi || String(tr.id)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}

                {/* 검색하기 / 지도로 보기 */}
                <TouchableOpacity
                  style={styles.searchActionBtn}
                  onPress={applyFilter}
                  activeOpacity={0.85}
                >
                  <Ionicons name="search" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.searchActionBtnText}>{t('jobs.filter_apply', '검색하기')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mapActionBtn}
                  onPress={() => { applyFilter(); setViewMode('map'); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="map" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.mapActionBtnText}>{t('jobs.view_map', '지도로 보기')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
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
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.outline,
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
  viewToggleBtn: { paddingHorizontal: 14, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  viewToggleBtnActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  viewToggleBtnText: { fontSize: 13, fontWeight: '500', color: Colors.onSurfaceVariant },
  viewToggleBtnTextActive: { color: Colors.onSurface, fontWeight: '700' },

  // Active filter bar
  activeFilterBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.outline,
  },
  activeFilterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
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

  // Search modal (웹앱 스타일)
  searchOverlayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start' },
  searchPanel: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.outline, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    backgroundColor: Colors.surfaceContainer, marginBottom: 10,
  },
  searchInputField: { flex: 1, ...Font.body3, color: Colors.onSurface, padding: 0 },
  dropdownRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.outline, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: Colors.surface, marginBottom: 10,
  },
  dropdownLabel: { ...Font.body3, color: Colors.onSurfaceVariant },
  dropdownLabelActive: { color: Colors.primary, fontWeight: '600' },
  pickerScroll: { marginBottom: 10, maxHeight: 44 },

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

  // Action buttons
  searchActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingVertical: 15, marginBottom: 10,
  },
  searchActionBtnText: { ...Font.t4, color: '#fff', fontWeight: '700' },
  mapActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e2a3a', borderRadius: Radius.pill,
    paddingVertical: 15,
  },
  mapActionBtnText: { ...Font.t4, color: '#fff', fontWeight: '700' },
});
