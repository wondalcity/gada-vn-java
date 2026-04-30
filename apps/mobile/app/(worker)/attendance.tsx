import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { showToast } from '../../lib/toast';

type AttendanceStatus = 'ATTENDED' | 'ABSENT' | 'HALF_DAY' | 'PENDING';

interface AttendanceRecord {
  id: string;
  jobTitle: string;
  siteName: string;
  workDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number | null;
  status: AttendanceStatus;
  dailyWage: number;
}

function formatDate(d: string) {
  const date = new Date(d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
}

function formatWage(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫';
}

type FilterTab = 'ALL' | 'ATTENDED' | 'ABSENT' | 'HALF_DAY' | 'PENDING';

export default function WorkerAttendanceScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; text: string }> = {
    ATTENDED: { label: t('attendance.status_present', '출근완료'), bg: Colors.successContainer, text: Colors.onSuccessContainer },
    ABSENT:   { label: t('attendance.status_absent',  '결근'),    bg: Colors.errorContainer,   text: Colors.onErrorContainer },
    HALF_DAY: { label: t('attendance.status_half_day', '반차'),   bg: '#FFF8E6',               text: '#92620A' },
    PENDING:  { label: t('attendance.status_pending', '예정'),    bg: Colors.primaryContainer, text: Colors.primary },
  };

  const loadRecords = useCallback(async () => {
    try {
      const data = await api.get<AttendanceRecord[]>('/workers/attendance');
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  async function handleCheckIn(recordId: string) {
    setCheckingIn(true);
    try {
      await api.post(`/attendance/${recordId}/check-in`);
      await loadRecords();
    } catch {
      showToast({ message: t('attendance.check_in_fail', '체크인에 실패했습니다'), type: 'error' });
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut(recordId: string) {
    Alert.alert(t('attendance.check_out_confirm_title'), t('attendance.check_out_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('attendance.check_out'), onPress: async () => {
          setCheckingIn(true);
          try {
            await api.post(`/attendance/${recordId}/check-out`);
            await loadRecords();
          } catch {
            showToast({ message: t('attendance.check_out_fail', '체크아웃에 실패했습니다'), type: 'error' });
          } finally {
            setCheckingIn(false);
          }
        },
      },
    ]);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.workDate === todayStr && r.status === 'PENDING');

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'ALL',      label: t('common.all', '전체') },
    { key: 'ATTENDED', label: t('attendance.status_present', '출근완료') },
    { key: 'ABSENT',   label: t('attendance.status_absent', '결근') },
    { key: 'HALF_DAY', label: t('attendance.status_half_day', '반차') },
    { key: 'PENDING',  label: t('attendance.status_pending', '예정') },
  ];

  const filteredRecords = activeTab === 'ALL' ? records : records.filter(r => r.status === activeTab);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Filter tabs — always at top ── */}
      <View style={styles.tabsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabChipLabel, activeTab === tab.key && styles.tabChipLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRecords(); }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={[styles.list, filteredRecords.length === 0 && styles.listEmpty]}
        ListHeaderComponent={
          todayRecord ? (
            <View style={styles.todayCard}>
              <View style={styles.todayTopRow}>
                <View style={styles.todayDateBadge}>
                  <Text style={styles.todayDateText}>오늘</Text>
                </View>
                <Text style={styles.todayJob} numberOfLines={1}>{todayRecord.jobTitle}</Text>
              </View>
              <Text style={styles.todaySite} numberOfLines={1}>{todayRecord.siteName}</Text>
              <View style={styles.todayActions}>
                {!todayRecord.checkInTime ? (
                  <TouchableOpacity
                    style={[styles.checkBtn, styles.checkInBtn]}
                    onPress={() => handleCheckIn(todayRecord.id)}
                    disabled={checkingIn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.checkInBtnText}>{t('attendance.check_in', '출근하기')}</Text>
                  </TouchableOpacity>
                ) : !todayRecord.checkOutTime ? (
                  <View style={styles.checkInProgressRow}>
                    <View style={styles.timeChip}>
                      <Text style={styles.timeChipLabel}>{t('attendance.check_in', '출근')}</Text>
                      <Text style={styles.timeChipValue}>{todayRecord.checkInTime}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.checkBtn, styles.checkOutBtn]}
                      onPress={() => handleCheckOut(todayRecord.id)}
                      disabled={checkingIn}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.checkOutBtnText}>{t('attendance.check_out', '퇴근하기')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.doneRow}>
                    <View style={styles.timeChip}>
                      <Text style={styles.timeChipLabel}>{t('attendance.check_in', '출근')}</Text>
                      <Text style={styles.timeChipValue}>{todayRecord.checkInTime}</Text>
                    </View>
                    <Text style={styles.arrowSep}>→</Text>
                    <View style={styles.timeChip}>
                      <Text style={styles.timeChipLabel}>{t('attendance.check_out', '퇴근')}</Text>
                      <Text style={styles.timeChipValue}>{todayRecord.checkOutTime}</Text>
                    </View>
                    {todayRecord.hoursWorked != null && (
                      <View style={styles.hoursBadge}>
                        <Text style={styles.hoursBadgeText}>{todayRecord.hoursWorked}h</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏱️</Text>
            <Text style={styles.emptyTitle}>{t('attendance.no_records', '출퇴근 내역이 없습니다')}</Text>
            <Text style={styles.emptyDesc}>{t('attendance.no_records_desc', '배정된 일자리의 출퇴근 기록이 여기에 표시됩니다')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.jobTitle}</Text>
                  <Text style={styles.cardSite} numberOfLines={1}>{item.siteName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaDate}>📅 {formatDate(item.workDate)}</Text>
                <View style={styles.metaRight}>
                  {item.checkInTime && (
                    <Text style={styles.metaTime}>
                      {item.checkInTime}{item.checkOutTime ? ` ~ ${item.checkOutTime}` : ''}
                    </Text>
                  )}
                  {item.hoursWorked != null && (
                    <View style={styles.hoursChip}>
                      <Text style={styles.hoursChipText}>{item.hoursWorked}h</Text>
                    </View>
                  )}
                  <Text style={styles.wageText}>{formatWage(item.dailyWage)}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Filter tabs ──────────────────────────────────────────────────────────
  tabsBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
    flexShrink: 0, // prevent flex expansion — tabs stay compact at top
  },
  flatList: { flex: 1 },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.outline,
    backgroundColor: Colors.surface,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabChipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  tabChipLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // ── List ─────────────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 32,
    gap: Spacing.sm,
  },
  listEmpty: {
    flexGrow: 1,
  },

  // ── Today card ───────────────────────────────────────────────────────────
  todayCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  todayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayDateBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todayDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  todayJob: { ...Font.t3, color: '#fff', flex: 1 },
  todaySite: { ...Font.caption, color: 'rgba(255,255,255,0.75)' },
  todayActions: { marginTop: 4 },
  checkBtn: {
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderRadius: Radius.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  checkInBtn: { backgroundColor: '#fff' },
  checkOutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  checkInBtnText:  { ...Font.t4, color: Colors.primary, fontWeight: '700' },
  checkOutBtnText: { ...Font.t4, color: '#fff', fontWeight: '700' },
  checkInProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  timeChip: { alignItems: 'center', gap: 2 },
  timeChipLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  timeChipValue: { ...Font.t4, color: '#fff', fontWeight: '700' },
  arrowSep: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  hoursBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hoursBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── Record card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: Colors.shadowBlack,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardInfo:  { flex: 1, gap: 3 },
  cardTitle: { ...Font.t4, color: Colors.onSurface },
  cardSite:  { ...Font.caption, color: Colors.onSurfaceVariant },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:  { fontSize: 12, fontWeight: '700' },

  cardDivider: { height: 1, backgroundColor: Colors.outline, marginVertical: Spacing.sm },

  metaRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaDate:  { ...Font.caption, color: Colors.onSurfaceVariant },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTime:  { ...Font.caption, color: Colors.onSurfaceVariant },
  hoursChip: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hoursChipText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  wageText: { ...Font.caption, color: Colors.primary, fontWeight: '700' },

  // ── Empty state ──────────────────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
    gap: 10,
  },
  emptyIcon:  { fontSize: 48, marginBottom: 4 },
  emptyTitle: { ...Font.t4, color: Colors.onSurface, fontWeight: '600' },
  emptyDesc:  { ...Font.caption, color: Colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: Spacing.xxl },
});
