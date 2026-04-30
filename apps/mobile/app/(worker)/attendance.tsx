import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  Alert, ScrollView, Modal,
} from 'react-native';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { showToast } from '../../lib/toast';

type StatusValue = 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE' | 'PENDING';

interface AttendanceRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  siteName: string;
  workDate: string;
  dailyWage: number;
  // Manager-set status
  managerStatus: StatusValue;
  managerStatusAt: string | null;
  // Worker self-reported status
  workerStatus: StatusValue | null;
  workerStatusAt: string | null;
  // Effective display status
  status: StatusValue;
  // Work duration
  workHours: number | null;
  workMinutes: number | null;
  workDurationSetBy: 'WORKER' | 'MANAGER' | null;
  workDurationConfirmed: boolean;
  workDurationConfirmedAt: string | null;
  notes: string | null;
}

// Work date is "active" when today >= work_date - 1 day
function isAttendanceActive(workDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wd = new Date(workDate);
  wd.setHours(0, 0, 0, 0);
  const activationDay = new Date(wd);
  activationDay.setDate(activationDay.getDate() - 1);
  return today >= activationDay;
}

function formatDate(d: string) {
  const date = new Date(d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
}

function formatWage(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫';
}

function formatDuration(hours: number | null, minutes: number | null): string {
  if (hours == null && minutes == null) return '';
  const h = hours ?? 0;
  const m = minutes ?? 0;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

type FilterTab = 'ALL' | 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE' | 'PENDING';

// ── Hours Picker Modal ──────────────────────────────────────────────────────

function HoursPickerModal({
  visible,
  initialHours,
  initialMinutes,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initialHours: number;
  initialMinutes: number;
  onConfirm: (hours: number, minutes: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [hours, setHours] = useState(initialHours);
  const [minutes, setMinutes] = useState(initialMinutes);

  const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);
  const MIN_OPTIONS = [0, 15, 30, 45];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={picker.overlay}>
        <View style={picker.sheet}>
          <Text style={picker.title}>{t('attendance.set_work_hours', '근무 시간 입력')}</Text>

          <View style={picker.row}>
            {/* Hours */}
            <View style={picker.col}>
              <Text style={picker.colLabel}>{t('attendance.hours', '시간')}</Text>
              <ScrollView style={picker.scroll} showsVerticalScrollIndicator={false}>
                {HOUR_OPTIONS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[picker.option, hours === h && picker.optionActive]}
                    onPress={() => setHours(h)}
                  >
                    <Text style={[picker.optionText, hours === h && picker.optionTextActive]}>
                      {h}시간
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Minutes */}
            <View style={picker.col}>
              <Text style={picker.colLabel}>{t('attendance.minutes', '분')}</Text>
              {MIN_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[picker.option, minutes === m && picker.optionActive]}
                  onPress={() => setMinutes(m)}
                >
                  <Text style={[picker.optionText, minutes === m && picker.optionTextActive]}>
                    {m}분
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={picker.actions}>
            <TouchableOpacity style={picker.cancelBtn} onPress={onClose}>
              <Text style={picker.cancelText}>{t('common.cancel', '취소')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={picker.confirmBtn}
              onPress={() => { onConfirm(hours, minutes); onClose(); }}
            >
              <Text style={picker.confirmText}>{t('common.confirm', '확인')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const picker = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.lg, paddingBottom: 40, gap: 16,
  },
  title: { ...Font.t3, color: Colors.onSurface, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 8 },
  colLabel: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '700', textAlign: 'center' },
  scroll: { maxHeight: 200 },
  option: {
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.outline,
    alignItems: 'center', marginBottom: 4,
    backgroundColor: Colors.surfaceContainer,
  },
  optionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { ...Font.caption, color: Colors.onSurface },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outline, alignItems: 'center',
  },
  cancelText: { ...Font.t4, color: Colors.onSurfaceVariant },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  confirmText: { ...Font.t4, color: '#fff', fontWeight: '700' },
});

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function WorkerAttendanceScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [pickerRecord, setPickerRecord] = useState<AttendanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    ATTENDED:    { label: t('attendance.status_present', '출근'), bg: Colors.successContainer,  text: Colors.onSuccessContainer },
    ABSENT:      { label: t('attendance.status_absent',  '결근'), bg: Colors.errorContainer,    text: Colors.onErrorContainer },
    EARLY_LEAVE: { label: t('attendance.status_early_leave', '조퇴'), bg: '#FFF3E0', text: '#E65100' },
    PENDING:     { label: t('attendance.status_pending', '미확정'), bg: Colors.primaryContainer, text: Colors.primary },
  };

  const WORKER_STATUS_OPTIONS: { value: 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE'; label: string; color: string }[] = [
    { value: 'ATTENDED',    label: t('attendance.attended', '출근'),    color: Colors.success },
    { value: 'ABSENT',      label: t('attendance.absent', '결근'),      color: Colors.error },
    { value: 'EARLY_LEAVE', label: t('attendance.early_leave', '조퇴'), color: '#E65100' },
  ];

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

  async function handleSetStatus(recordId: string, status: 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE') {
    setSubmitting(recordId);
    try {
      await api.post(`/attendance/${recordId}/worker-status`, { status });
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, workerStatus: status, workerStatusAt: new Date().toISOString() } : r,
      ));
      showToast({ message: STATUS_CONFIG[status]?.label + ' 처리되었습니다', type: 'success' });
    } catch {
      showToast({ message: t('attendance.status_fail', '상태 변경에 실패했습니다'), type: 'error' });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleSetDuration(recordId: string, hours: number, minutes: number) {
    setSubmitting(recordId);
    try {
      await api.put(`/attendance/${recordId}/work-duration`, { hours, minutes });
      setRecords(prev => prev.map(r =>
        r.id === recordId
          ? { ...r, workHours: hours, workMinutes: minutes, workDurationSetBy: 'WORKER', workDurationConfirmed: false }
          : r,
      ));
      showToast({ message: t('attendance.duration_saved', '근무 시간이 저장되었습니다'), type: 'success' });
    } catch {
      showToast({ message: t('attendance.duration_fail', '근무 시간 저장에 실패했습니다'), type: 'error' });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleConfirmDuration(recordId: string) {
    Alert.alert(
      t('attendance.confirm_duration_title', '근무 시간 확정'),
      t('attendance.confirm_duration_body', '근무 시간을 최종 확정하시겠습니까?'),
      [
        { text: t('common.cancel', '취소'), style: 'cancel' },
        {
          text: t('common.confirm', '확정'),
          onPress: async () => {
            setSubmitting(recordId);
            try {
              await api.post(`/attendance/${recordId}/work-duration/confirm`);
              setRecords(prev => prev.map(r =>
                r.id === recordId
                  ? { ...r, workDurationConfirmed: true, workDurationConfirmedAt: new Date().toISOString() }
                  : r,
              ));
              showToast({ message: t('attendance.duration_confirmed', '근무 시간이 확정되었습니다'), type: 'success' });
            } catch {
              showToast({ message: t('attendance.confirm_fail', '확정에 실패했습니다'), type: 'error' });
            } finally {
              setSubmitting(null);
            }
          },
        },
      ],
    );
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'ALL',         label: t('common.all', '전체') },
    { key: 'ATTENDED',    label: t('attendance.attended', '출근') },
    { key: 'ABSENT',      label: t('attendance.absent', '결근') },
    { key: 'EARLY_LEAVE', label: t('attendance.early_leave', '조퇴') },
    { key: 'PENDING',     label: t('attendance.status_pending', '미확정') },
  ];

  const filteredRecords = activeTab === 'ALL'
    ? records
    : records.filter(r => r.workerStatus === activeTab || (activeTab === 'PENDING' && !r.workerStatus));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Filter tabs ── */}
      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
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
        keyExtractor={item => item.id}
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏱️</Text>
            <Text style={styles.emptyTitle}>{t('attendance.no_records', '출퇴근 내역이 없습니다')}</Text>
            <Text style={styles.emptyDesc}>{t('attendance.no_records_desc', '배정된 일자리의 출퇴근 기록이 여기에 표시됩니다')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const active = isAttendanceActive(item.workDate);
          const isSubmitting = submitting === item.id;
          const workerCfg = STATUS_CONFIG[item.workerStatus ?? 'PENDING'];
          const managerCfg = STATUS_CONFIG[item.managerStatus ?? 'PENDING'];
          const hasDuration = item.workHours != null;

          return (
            <View style={styles.card}>
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.jobTitle}</Text>
                  <Text style={styles.cardSite} numberOfLines={1}>{item.siteName}</Text>
                </View>
                <Text style={styles.cardDate}>📅 {formatDate(item.workDate)}</Text>
              </View>

              <View style={styles.divider} />

              {/* Status section */}
              <View style={styles.statusSection}>
                {/* Manager status */}
                <View style={styles.statusRow}>
                  <Text style={styles.statusRoleLabel}>관리자</Text>
                  <View style={[styles.statusBadge, { backgroundColor: managerCfg.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: managerCfg.text }]}>{managerCfg.label}</Text>
                  </View>
                  {item.managerStatusAt && item.managerStatus !== 'PENDING' && (
                    <Text style={styles.statusTime}>
                      {new Date(item.managerStatusAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>

                {/* Worker status (self-report) */}
                <View style={styles.statusRow}>
                  <Text style={styles.statusRoleLabel}>나의 상태</Text>
                  <View style={[styles.statusBadge, { backgroundColor: workerCfg.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: workerCfg.text }]}>{workerCfg.label}</Text>
                  </View>
                  {item.workerStatusAt && item.workerStatus && (
                    <Text style={styles.statusTime}>
                      {new Date(item.workerStatusAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>

              {/* Status buttons (only active records) */}
              {active && (
                <View style={styles.btnRow}>
                  {WORKER_STATUS_OPTIONS.map(opt => {
                    const selected = item.workerStatus === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.statusBtn,
                          selected && { backgroundColor: opt.color, borderColor: opt.color },
                        ]}
                        onPress={() => handleSetStatus(item.id, opt.value)}
                        disabled={isSubmitting}
                        activeOpacity={0.75}
                      >
                        {isSubmitting && selected
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={[styles.statusBtnText, selected && styles.statusBtnTextActive]}>{opt.label}</Text>
                        }
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Work duration section */}
              {active && (
                <View style={styles.durationSection}>
                  <View style={styles.durationHeader}>
                    <Text style={styles.durationLabel}>근무 시간</Text>
                    {hasDuration && (
                      <View style={styles.durationInfo}>
                        <Text style={styles.durationValue}>
                          {formatDuration(item.workHours, item.workMinutes)}
                        </Text>
                        {item.workDurationSetBy && (
                          <Text style={styles.durationSetBy}>
                            ({item.workDurationSetBy === 'MANAGER' ? '관리자 입력' : '내가 입력'})
                          </Text>
                        )}
                        {item.workDurationConfirmed
                          ? <View style={styles.confirmedBadge}><Text style={styles.confirmedText}>확정됨</Text></View>
                          : <View style={styles.unconfirmedBadge}><Text style={styles.unconfirmedText}>미확정</Text></View>
                        }
                      </View>
                    )}
                  </View>

                  <View style={styles.durationActions}>
                    <TouchableOpacity
                      style={styles.durationBtn}
                      onPress={() => setPickerRecord(item)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.durationBtnText}>
                        {hasDuration ? '시간 수정' : '시간 입력'}
                      </Text>
                    </TouchableOpacity>

                    {hasDuration && !item.workDurationConfirmed && (
                      <TouchableOpacity
                        style={[styles.durationBtn, styles.confirmDurationBtn]}
                        onPress={() => handleConfirmDuration(item.id)}
                        disabled={isSubmitting}
                      >
                        <Text style={[styles.durationBtnText, styles.confirmDurationBtnText]}>확정</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Finalized duration for past records */}
              {!active && hasDuration && (
                <View style={styles.finalizedRow}>
                  <Text style={styles.finalizedLabel}>근무: {formatDuration(item.workHours, item.workMinutes)}</Text>
                  {item.workDurationConfirmed
                    ? <View style={styles.confirmedBadge}><Text style={styles.confirmedText}>확정</Text></View>
                    : <View style={styles.unconfirmedBadge}><Text style={styles.unconfirmedText}>미확정</Text></View>
                  }
                </View>
              )}

              {/* Wage */}
              <View style={styles.wageRow}>
                <Text style={styles.wageText}>{formatWage(item.dailyWage)}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Hours picker modal */}
      {pickerRecord && (
        <HoursPickerModal
          visible={!!pickerRecord}
          initialHours={pickerRecord.workHours ?? 8}
          initialMinutes={pickerRecord.workMinutes ?? 0}
          onConfirm={(h, m) => handleSetDuration(pickerRecord.id, h, m)}
          onClose={() => setPickerRecord(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Filter tabs ─────────────────────────────────────────────────────────
  tabsBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
    flexShrink: 0,
  },
  flatList: { flex: 1 },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.outline,
    backgroundColor: Colors.surface,
  },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabChipLabel: { fontSize: 13, fontWeight: '500', color: Colors.onSurfaceVariant },
  tabChipLabelActive: { color: '#fff', fontWeight: '700' },

  // ── List ──────────────────────────────────────────────────────────────
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 32, gap: Spacing.sm },
  listEmpty: { flexGrow: 1 },

  // ── Card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowColor: Colors.shadowBlack,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { ...Font.t4, color: Colors.onSurface },
  cardSite:  { ...Font.caption, color: Colors.onSurfaceVariant },
  cardDate:  { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  divider:   { height: 1, backgroundColor: Colors.outline },

  // ── Status ────────────────────────────────────────────────────────────
  statusSection: { gap: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusRoleLabel: { fontSize: 12, color: Colors.onSurfaceVariant, width: 60, fontWeight: '500' },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusTime: { ...Font.caption, color: Colors.onSurfaceVariant },

  // ── Status buttons ────────────────────────────────────────────────────
  btnRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, paddingVertical: 9, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.outline,
    alignItems: 'center', backgroundColor: Colors.surfaceContainer,
  },
  statusBtnText: { fontSize: 13, color: Colors.onSurfaceVariant, fontWeight: '600' },
  statusBtnTextActive: { color: '#fff' },

  // ── Duration ──────────────────────────────────────────────────────────
  durationSection: { gap: 8 },
  durationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  durationLabel: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
  durationInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  durationValue: { ...Font.caption, color: Colors.onSurface, fontWeight: '700' },
  durationSetBy: { ...Font.caption, color: Colors.onSurfaceVariant },
  confirmedBadge: {
    backgroundColor: Colors.successContainer, borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  confirmedText: { fontSize: 11, fontWeight: '700', color: Colors.onSuccessContainer },
  unconfirmedBadge: {
    backgroundColor: Colors.primaryContainer, borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  unconfirmedText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  durationActions: { flexDirection: 'row', gap: 8 },
  durationBtn: {
    flex: 1, paddingVertical: 8, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center',
  },
  durationBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  confirmDurationBtn: { backgroundColor: Colors.primary },
  confirmDurationBtnText: { color: '#fff' },

  // ── Finalized row (past records) ──────────────────────────────────────
  finalizedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  finalizedLabel: { ...Font.caption, color: Colors.onSurface, fontWeight: '600' },

  // ── Wage ─────────────────────────────────────────────────────────────
  wageRow: { alignItems: 'flex-end' },
  wageText: { ...Font.caption, color: Colors.primary, fontWeight: '700' },

  // ── Empty ─────────────────────────────────────────────────────────────
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 60, gap: 10,
  },
  emptyIcon:  { fontSize: 48, marginBottom: 4 },
  emptyTitle: { ...Font.t4, color: Colors.onSurface, fontWeight: '600' },
  emptyDesc:  { ...Font.caption, color: Colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: Spacing.xxl },
});
