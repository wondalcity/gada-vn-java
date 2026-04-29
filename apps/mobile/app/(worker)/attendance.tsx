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

// STATUS_CONFIG is built inside the component to use t()


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
    ATTENDED: { label: t('attendance.status_present', '출근'), bg: Colors.successContainer, text: Colors.onSuccessContainer },
    ABSENT:   { label: t('attendance.status_absent',  '결근'), bg: Colors.errorContainer,   text: Colors.onErrorContainer },
    HALF_DAY: { label: t('attendance.status_half_day', '반차'), bg: '#FFF8E6',               text: '#92620A' },
    PENDING:  { label: t('attendance.status_pending', '미확인'), bg: Colors.primaryContainer, text: Colors.primary },
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
    { key: 'ATTENDED', label: t('attendance.status_present', '출근') },
    { key: 'ABSENT',   label: t('attendance.status_absent', '결근') },
    { key: 'HALF_DAY', label: t('attendance.status_half_day', '반차') },
    { key: 'PENDING',  label: t('attendance.status_pending', '미확인') },
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
      {/* Today's check-in/out card */}
      {todayRecord && (
        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>{t('attendance.today')}</Text>
          <Text style={styles.todayJob} numberOfLines={1}>{todayRecord.jobTitle}</Text>
          <Text style={styles.todaySite}>{todayRecord.siteName}</Text>
          <View style={styles.todayActions}>
            {!todayRecord.checkInTime ? (
              <TouchableOpacity
                style={[styles.checkBtn, styles.checkInBtn]}
                onPress={() => handleCheckIn(todayRecord.id)}
                disabled={checkingIn}
              >
                <Text style={styles.checkBtnText}>{t('attendance.check_in')}</Text>
              </TouchableOpacity>
            ) : !todayRecord.checkOutTime ? (
              <>
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>{t('attendance.check_in')}</Text>
                  <Text style={styles.timeValue}>{todayRecord.checkInTime}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.checkBtn, styles.checkOutBtn]}
                  onPress={() => handleCheckOut(todayRecord.id)}
                  disabled={checkingIn}
                >
                  <Text style={styles.checkBtnText}>{t('attendance.check_out')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.doneRow}>
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>{t('attendance.check_in')}</Text>
                  <Text style={styles.timeValue}>{todayRecord.checkInTime}</Text>
                </View>
                <Text style={styles.timeSep}>→</Text>
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>{t('attendance.check_out')}</Text>
                  <Text style={styles.timeValue}>{todayRecord.checkOutTime}</Text>
                </View>
                {todayRecord.hoursWorked != null && (
                  <Text style={styles.hoursText}>{t('attendance.hours', { hours: todayRecord.hoursWorked })}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsRow}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRecords(); }}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏱️</Text>
            <Text style={styles.emptyText}>{t('attendance.no_records')}</Text>
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

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>📅 {formatDate(item.workDate)}</Text>
                {item.checkInTime && (
                  <Text style={styles.metaText}>
                    {item.checkInTime}{item.checkOutTime ? ` ~ ${item.checkOutTime}` : ` ${t('attendance.check_in')}`}
                  </Text>
                )}
                {item.hoursWorked != null && (
                  <Text style={styles.hoursChip}>{t('attendance.hours', { hours: item.hoursWorked })}</Text>
                )}
                <Text style={styles.wageText}>{formatWage(item.dailyWage)}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  todayCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: 0,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  todayTitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5 },
  todayJob: { ...Font.t3, color: '#fff' },
  todaySite: { ...Font.caption, color: 'rgba(255,255,255,0.8)' },
  todayActions: { marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkBtn: {
    paddingVertical: 10, paddingHorizontal: 28,
    borderRadius: Radius.xs,
    alignItems: 'center',
  },
  checkInBtn: { backgroundColor: '#fff' },
  checkOutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: '#fff' },
  checkBtnText: { ...Font.t4, color: Colors.primary, fontWeight: '700' },
  timeInfo: { alignItems: 'center' },
  timeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  timeValue: { ...Font.t3, color: '#fff', fontWeight: '700' },
  timeSep: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  hoursText: { ...Font.caption, color: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },

  sectionTitle: { ...Font.t4, color: Colors.onSurface, marginBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, gap: Spacing.md, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: Colors.shadowBlack,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardInfo: { flex: 1 },
  cardTitle: { ...Font.t4, color: Colors.onSurface },
  cardSite: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { ...Font.caption, fontWeight: '700' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'center' },
  metaText: { ...Font.caption, color: Colors.onSurfaceVariant },
  hoursChip: { ...Font.caption, color: Colors.primary, fontWeight: '600', backgroundColor: Colors.primaryContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  wageText: { ...Font.caption, color: Colors.primary, fontWeight: '700', marginLeft: 'auto' },

  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant },

  tabsRow: {
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.outline,
    height: 52, flexShrink: 0,
  },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surface,
    alignSelf: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '500', color: Colors.onSurfaceVariant },
  tabLabelActive: { color: '#fff', fontWeight: '700' },
});
