import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  Alert, ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { showToast } from '../../lib/toast';

// ── 타입 ─────────────────────────────────────────────────────────────────────

type AttendanceStatus =
  | 'PENDING'
  | 'PRE_CONFIRMED'
  | 'COMMUTING'
  | 'WORK_STARTED'
  | 'WORK_COMPLETED'
  | 'ATTENDED'
  | 'ABSENT'
  | 'EARLY_LEAVE';

interface StatusHistoryEntry {
  id: string;
  changedByRole: 'WORKER' | 'MANAGER' | 'SYSTEM';
  changedByName: string | null;
  oldStatus: string | null;
  newStatus: string;
  changedAt: string;
  note: string | null;
}

interface AttendanceRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  siteName: string;
  workDate: string;
  workStartTime: string | null;
  dailyWage: number;
  status: AttendanceStatus;
  updatedByRole: 'WORKER' | 'MANAGER' | null;
  lastUpdatedAt: string | null;
  managerStatus: AttendanceStatus;
  managerStatusAt: string | null;
  workerStatus: AttendanceStatus | null;
  workerStatusAt: string | null;
  workHours: number | null;
  workMinutes: number | null;
  workDurationSetBy: 'WORKER' | 'MANAGER' | null;
  workDurationConfirmed: boolean;
  workDurationConfirmedAt: string | null;
  notes: string | null;
  statusHistory: StatusHistoryEntry[];
}

// ── 상태 설정 ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: string; color: string; bg: string }> = {
  PENDING:       { label: '미확인',     icon: '⏳', color: '#9E9E9E', bg: '#F5F5F5' },
  PRE_CONFIRMED: { label: '출근 예정',  icon: '✅', color: '#1976D2', bg: '#E3F2FD' },
  COMMUTING:     { label: '출근 중',    icon: '🚌', color: '#F57C00', bg: '#FFF3E0' },
  WORK_STARTED:  { label: '작업 시작',  icon: '⚒️', color: '#388E3C', bg: '#E8F5E9' },
  WORK_COMPLETED:{ label: '작업 마감',  icon: '🏁', color: '#7B1FA2', bg: '#F3E5F5' },
  ATTENDED:      { label: '출근 확정',  icon: '✓',  color: '#2E7D32', bg: '#C8E6C9' },
  ABSENT:        { label: '결근',       icon: '✗',  color: '#C62828', bg: '#FFCDD2' },
  EARLY_LEAVE:   { label: '조퇴',       icon: '↩',  color: '#E65100', bg: '#FFE0B2' },
};

// 날짜 기준 활성화 여부: work_date - 1일 이상
function isAttendanceActive(workDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wd = new Date(workDate + 'T00:00:00');
  const activation = new Date(wd);
  activation.setDate(activation.getDate() - 1);
  return today >= activation;
}

function isToday(workDate: string): boolean {
  const today = new Date();
  const wd = new Date(workDate + 'T00:00:00');
  return today.toDateString() === wd.toDateString();
}

// 작업 시작 2시간 전인지
function isWithin2HoursOfStart(workDate: string, workStartTime: string | null): boolean {
  const now = new Date();
  const wd = new Date(workDate + 'T00:00:00');
  // 기본 작업 시작: 08:00
  const [h, m] = (workStartTime ?? '08:00').split(':').map(Number);
  const startDt = new Date(wd);
  startDt.setHours(h, m, 0, 0);
  const diffMs = startDt.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= 2 * 60 * 60 * 1000;
}

function formatDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
}

function formatWage(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫';
}

function formatDuration(hours: number | null, minutes: number | null): string {
  if (hours == null && minutes == null) return '-';
  const h = hours ?? 0;
  const m = minutes ?? 0;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
}

type FilterTab = 'ALL' | 'PENDING' | 'PRE_CONFIRMED' | 'WORK_STARTED' | 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE';

// ── 근무시간 피커 모달 ────────────────────────────────────────────────────────

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
  const [hours, setHours] = useState(initialHours);
  const [minutes, setMinutes] = useState(initialMinutes);
  const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);
  const MIN_OPTIONS = [0, 15, 30, 45];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={picker.overlay}>
        <View style={picker.sheet}>
          <Text style={picker.title}>근무 시간 입력</Text>
          <View style={picker.row}>
            <View style={picker.col}>
              <Text style={picker.colLabel}>시간</Text>
              <ScrollView style={picker.scroll} showsVerticalScrollIndicator={false}>
                {HOUR_OPTIONS.map(h => (
                  <TouchableOpacity
                    key={h} style={[picker.option, hours === h && picker.optionActive]}
                    onPress={() => setHours(h)}
                  >
                    <Text style={[picker.optionText, hours === h && picker.optionTextActive]}>{h}시간</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={picker.col}>
              <Text style={picker.colLabel}>분</Text>
              {MIN_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m} style={[picker.option, minutes === m && picker.optionActive]}
                  onPress={() => setMinutes(m)}
                >
                  <Text style={[picker.optionText, minutes === m && picker.optionTextActive]}>{m}분</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={picker.actions}>
            <TouchableOpacity style={picker.cancelBtn} onPress={onClose}>
              <Text style={picker.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={picker.confirmBtn} onPress={() => { onConfirm(hours, minutes); onClose(); }}>
              <Text style={picker.confirmText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const picker = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 40, gap: 16 },
  title: { ...Font.t3, color: Colors.onSurface, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 8 },
  colLabel: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '700', textAlign: 'center' },
  scroll: { maxHeight: 200 },
  option: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center', marginBottom: 4, backgroundColor: Colors.surfaceContainer },
  optionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { ...Font.caption, color: Colors.onSurface },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center' },
  cancelText: { ...Font.t4, color: Colors.onSurfaceVariant },
  confirmBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  confirmText: { ...Font.t4, color: '#fff', fontWeight: '700' },
});

// ── 상태 이력 타임라인 ────────────────────────────────────────────────────────

function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  if (!history || history.length === 0) return null;
  return (
    <View style={timeline.container}>
      <Text style={timeline.title}>변경 이력</Text>
      {history.map((entry, idx) => {
        const cfg = STATUS_CONFIG[entry.newStatus as AttendanceStatus] ?? STATUS_CONFIG.PENDING;
        const isLast = idx === history.length - 1;
        return (
          <View key={entry.id} style={timeline.row}>
            {/* 타임라인 선 */}
            <View style={timeline.lineWrap}>
              <View style={[timeline.dot, { backgroundColor: cfg.color }]} />
              {!isLast && <View style={timeline.line} />}
            </View>
            {/* 내용 */}
            <View style={timeline.content}>
              <View style={timeline.contentRow}>
                <View style={[timeline.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[timeline.badgeText, { color: cfg.color }]}>
                    {cfg.icon} {cfg.label}
                  </Text>
                </View>
                <Text style={timeline.roleTag}>
                  {entry.changedByRole === 'MANAGER' ? '관리자' : '근로자'}
                </Text>
              </View>
              <Text style={timeline.meta}>
                {entry.changedByName ?? ''} · {formatDateTime(entry.changedAt)}
              </Text>
              {entry.note && <Text style={timeline.note}>{entry.note}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const timeline = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: Colors.outline, paddingTop: 10, gap: 0 },
  title: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, minHeight: 40 },
  lineWrap: { width: 20, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: Colors.outline, marginTop: 2 },
  content: { flex: 1, paddingBottom: 10, gap: 3 },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  roleTag: { fontSize: 10, color: Colors.onSurfaceVariant, borderWidth: 1, borderColor: Colors.outline, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  meta: { ...Font.caption, color: Colors.onSurfaceVariant, fontSize: 11 },
  note: { ...Font.caption, color: Colors.onSurface, fontSize: 11, fontStyle: 'italic' },
});

// ── 메인 화면 ─────────────────────────────────────────────────────────────────

export default function WorkerAttendanceScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [pickerRecord, setPickerRecord] = useState<AttendanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

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

  async function handleSetStatus(recordId: string, status: AttendanceStatus) {
    setSubmitting(recordId + status);
    try {
      await api.post(`/attendance/${recordId}/worker-status`, { status });
      const label = STATUS_CONFIG[status]?.label ?? status;
      setRecords(prev => prev.map(r =>
        r.id === recordId
          ? {
              ...r,
              status,
              workerStatus: status,
              workerStatusAt: new Date().toISOString(),
              updatedByRole: 'WORKER',
              statusHistory: [
                ...r.statusHistory,
                {
                  id: Date.now().toString(),
                  changedByRole: 'WORKER',
                  changedByName: '나',
                  oldStatus: r.status,
                  newStatus: status,
                  changedAt: new Date().toISOString(),
                  note: null,
                },
              ],
            }
          : r,
      ));
      showToast({ message: `${label}으로 변경되었습니다`, type: 'success' });
    } catch {
      showToast({ message: '상태 변경에 실패했습니다', type: 'error' });
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
      showToast({ message: '근무 시간이 저장되었습니다', type: 'success' });
    } catch {
      showToast({ message: '근무 시간 저장에 실패했습니다', type: 'error' });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleConfirmDuration(recordId: string) {
    Alert.alert('근무 시간 확정', '근무 시간을 최종 확정하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확정',
        onPress: async () => {
          setSubmitting(recordId);
          try {
            await api.post(`/attendance/${recordId}/work-duration/confirm`);
            setRecords(prev => prev.map(r =>
              r.id === recordId
                ? { ...r, workDurationConfirmed: true, workDurationConfirmedAt: new Date().toISOString() }
                : r,
            ));
            showToast({ message: '근무 시간이 확정되었습니다', type: 'success' });
          } catch {
            showToast({ message: '확정에 실패했습니다', type: 'error' });
          } finally {
            setSubmitting(null);
          }
        },
      },
    ]);
  }

  // 근로자가 누를 수 있는 상태 버튼 (맥락에 따라 다름)
  function getAvailableActions(record: AttendanceRecord): Array<{ status: AttendanceStatus; label: string; icon: string; color: string }> {
    const today = isToday(record.workDate);
    const active = isAttendanceActive(record.workDate);
    if (!active) return [];

    const current = record.status;

    // 내일 작업 (오늘은 day before): PRE_CONFIRMED만 가능
    if (!today) {
      if (current === 'PENDING') {
        return [{ status: 'PRE_CONFIRMED', label: '출근 예정 확인', icon: '✅', color: Colors.primary }];
      }
      return [];
    }

    // 오늘 작업
    const actions: Array<{ status: AttendanceStatus; label: string; icon: string; color: string }> = [];

    if (current === 'PENDING' || current === 'PRE_CONFIRMED') {
      actions.push({ status: 'COMMUTING', label: '출근 중', icon: '🚌', color: '#F57C00' });
    }
    if (current === 'PENDING' || current === 'PRE_CONFIRMED' || current === 'COMMUTING') {
      actions.push({ status: 'WORK_STARTED', label: '작업 시작', icon: '⚒️', color: '#388E3C' });
    }
    if (current === 'WORK_STARTED') {
      actions.push({ status: 'EARLY_LEAVE', label: '조퇴', icon: '↩', color: '#E65100' });
    }
    if (current === 'WORK_STARTED' || current === 'EARLY_LEAVE') {
      actions.push({ status: 'ABSENT', label: '결근 처리', icon: '✗', color: Colors.error });
    }

    return actions;
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'PENDING', label: '미확인' },
    { key: 'PRE_CONFIRMED', label: '출근예정' },
    { key: 'WORK_STARTED', label: '작업중' },
    { key: 'ATTENDED', label: '출근확정' },
    { key: 'ABSENT', label: '결근' },
    { key: 'EARLY_LEAVE', label: '조퇴' },
  ];

  const filteredRecords = activeTab === 'ALL'
    ? records
    : records.filter(r => r.status === activeTab);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>

      {/* ── 필터 탭 ── */}
      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRecords(); }} colors={[Colors.primary]} tintColor={Colors.primary} />}
        contentContainerStyle={[styles.list, filteredRecords.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏱️</Text>
            <Text style={styles.emptyTitle}>출퇴근 내역이 없습니다</Text>
            <Text style={styles.emptyDesc}>배정된 일자리의 출퇴근 기록이 여기에 표시됩니다</Text>
          </View>
        }
        renderItem={({ item }) => {
          const active = isAttendanceActive(item.workDate);
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
          const managerCfg = STATUS_CONFIG[item.managerStatus] ?? STATUS_CONFIG.PENDING;
          const hasDuration = item.workHours != null;
          const actions = getAvailableActions(item);
          const historyExpanded = expandedHistory.has(item.id);
          const hasHistory = item.statusHistory && item.statusHistory.length > 0;
          const isSubmittingAny = submitting?.startsWith(item.id) ?? false;

          return (
            <View style={styles.card}>
              {/* 헤더 */}
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.jobTitle}</Text>
                  <Text style={styles.cardSite} numberOfLines={1}>{item.siteName}</Text>
                </View>
                <Text style={styles.cardDate}>📅 {formatDate(item.workDate)}</Text>
              </View>

              {/* 현재 상태 배지 */}
              <View style={styles.statusBannerRow}>
                <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
                  <Text style={styles.statusBannerIcon}>{cfg.icon}</Text>
                  <Text style={[styles.statusBannerLabel, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {/* 관리자가 다른 상태를 설정한 경우 표시 */}
                {item.managerStatus !== item.status && item.managerStatus !== 'PENDING' && (
                  <View style={styles.managerStatusWrap}>
                    <Text style={styles.managerStatusLabel}>관리자:</Text>
                    <View style={[styles.miniStatusBadge, { backgroundColor: managerCfg.bg }]}>
                      <Text style={[styles.miniStatusText, { color: managerCfg.color }]}>
                        {managerCfg.label}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* 마지막 업데이트 정보 */}
              {item.lastUpdatedAt && item.status !== 'PENDING' && (
                <Text style={styles.updatedInfo}>
                  {item.updatedByRole === 'MANAGER' ? '관리자' : '나'} · {formatTime(item.lastUpdatedAt)} 업데이트
                </Text>
              )}

              <View style={styles.divider} />

              {/* 상태 버튼 (활성 기록만) */}
              {active && actions.length > 0 && (
                <View style={styles.actionsSection}>
                  <Text style={styles.actionsSectionTitle}>상태 변경</Text>
                  <View style={styles.btnRow}>
                    {actions.map(action => {
                      const isActive = item.status === action.status;
                      const isLoading = submitting === item.id + action.status;
                      return (
                        <TouchableOpacity
                          key={action.status}
                          style={[
                            styles.actionBtn,
                            isActive && { backgroundColor: action.color, borderColor: action.color },
                          ]}
                          onPress={() => handleSetStatus(item.id, action.status)}
                          disabled={isSubmittingAny}
                          activeOpacity={0.75}
                        >
                          {isLoading
                            ? <ActivityIndicator size="small" color={isActive ? '#fff' : action.color} />
                            : <>
                                <Text style={styles.actionBtnIcon}>{action.icon}</Text>
                                <Text style={[styles.actionBtnText, isActive && { color: '#fff' }]}>
                                  {action.label}
                                </Text>
                              </>
                          }
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 근무 시간 입력 (작업 시작 이후) */}
              {active && (item.status === 'WORK_STARTED' || item.status === 'EARLY_LEAVE' || item.status === 'WORK_COMPLETED') && (
                <View style={styles.durationSection}>
                  <View style={styles.durationHeader}>
                    <Text style={styles.durationLabel}>근무 시간</Text>
                    {hasDuration && (
                      <View style={styles.durationInfo}>
                        <Text style={styles.durationValue}>{formatDuration(item.workHours, item.workMinutes)}</Text>
                        <Text style={styles.durationSetBy}>
                          ({item.workDurationSetBy === 'MANAGER' ? '관리자 입력' : '내가 입력'})
                        </Text>
                        {item.workDurationConfirmed
                          ? <View style={styles.confirmedBadge}><Text style={styles.confirmedText}>확정</Text></View>
                          : <View style={styles.unconfirmedBadge}><Text style={styles.unconfirmedText}>미확정</Text></View>
                        }
                      </View>
                    )}
                  </View>
                  <View style={styles.durationActions}>
                    <TouchableOpacity style={styles.durationBtn} onPress={() => setPickerRecord(item)} disabled={isSubmittingAny}>
                      <Ionicons name="time-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.durationBtnText}>{hasDuration ? '시간 수정' : '시간 입력'}</Text>
                    </TouchableOpacity>
                    {hasDuration && !item.workDurationConfirmed && (
                      <TouchableOpacity style={[styles.durationBtn, styles.confirmDurationBtn]} onPress={() => handleConfirmDuration(item.id)} disabled={isSubmittingAny}>
                        <Text style={[styles.durationBtnText, { color: '#fff' }]}>확정</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* 완료된 기록 근무시간 */}
              {!active && hasDuration && (
                <View style={styles.finalizedRow}>
                  <Ionicons name="time" size={13} color={Colors.onSurfaceVariant} />
                  <Text style={styles.finalizedLabel}> 근무: {formatDuration(item.workHours, item.workMinutes)}</Text>
                  {item.workDurationConfirmed
                    ? <View style={styles.confirmedBadge}><Text style={styles.confirmedText}>확정</Text></View>
                    : <View style={styles.unconfirmedBadge}><Text style={styles.unconfirmedText}>미확정</Text></View>
                  }
                </View>
              )}

              {/* 일당 */}
              <View style={styles.wageRow}>
                <Text style={styles.wageText}>{formatWage(item.dailyWage)}</Text>
              </View>

              {/* 이력 토글 */}
              {hasHistory && (
                <TouchableOpacity
                  style={styles.historyToggle}
                  onPress={() => {
                    setExpandedHistory(prev => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.historyToggleText}>
                    변경 이력 ({item.statusHistory.length}건)
                  </Text>
                  <Ionicons
                    name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              )}

              {historyExpanded && (
                <StatusTimeline history={item.statusHistory} />
              )}
            </View>
          );
        }}
      />

      {/* 근무시간 피커 */}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabsBar: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.outline },
  flatList: { flex: 1 },
  tabsContent: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: 10, gap: 8 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.outline, backgroundColor: Colors.surface },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabChipLabel: { fontSize: 12, fontWeight: '500', color: Colors.onSurfaceVariant },
  tabChipLabelActive: { color: '#fff', fontWeight: '700' },

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 32, gap: Spacing.sm },
  listEmpty: { flexGrow: 1 },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { ...Font.t4, color: Colors.onSurface },
  cardSite: { ...Font.caption, color: Colors.onSurfaceVariant },
  cardDate: { ...Font.caption, color: Colors.onSurfaceVariant },

  // 상태 배너
  statusBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  statusBannerIcon: { fontSize: 14 },
  statusBannerLabel: { fontSize: 13, fontWeight: '700' },
  managerStatusWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  managerStatusLabel: { ...Font.caption, color: Colors.onSurfaceVariant },
  miniStatusBadge: { borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  miniStatusText: { fontSize: 10, fontWeight: '700' },
  updatedInfo: { ...Font.caption, color: Colors.onSurfaceVariant, fontSize: 11 },

  divider: { height: 1, backgroundColor: Colors.outline },

  // 상태 버튼
  actionsSection: { gap: 8 },
  actionsSectionTitle: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.outline, backgroundColor: Colors.surfaceContainer,
  },
  actionBtnIcon: { fontSize: 14 },
  actionBtnText: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '600' },

  // 근무시간
  durationSection: { gap: 6 },
  durationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  durationLabel: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '600' },
  durationInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  durationValue: { ...Font.caption, color: Colors.onSurface, fontWeight: '700' },
  durationSetBy: { ...Font.caption, color: Colors.onSurfaceVariant },
  confirmedBadge: { backgroundColor: Colors.successContainer, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  confirmedText: { fontSize: 11, fontWeight: '700', color: Colors.onSuccessContainer },
  unconfirmedBadge: { backgroundColor: Colors.primaryContainer, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  unconfirmedText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  durationActions: { flexDirection: 'row', gap: 8 },
  durationBtn: { flex: 1, flexDirection: 'row', paddingVertical: 9, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  durationBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  confirmDurationBtn: { backgroundColor: Colors.primary },

  // 완료 기록
  finalizedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  finalizedLabel: { ...Font.caption, color: Colors.onSurface, fontWeight: '600' },

  // 일당
  wageRow: { alignItems: 'flex-end' },
  wageText: { ...Font.caption, color: Colors.primary, fontWeight: '700' },

  // 이력 토글
  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer },
  historyToggleText: { ...Font.caption, color: Colors.primary, fontWeight: '600' },

  // 빈 상태
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, gap: 10 },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { ...Font.t4, color: Colors.onSurface, fontWeight: '600' },
  emptyDesc: { ...Font.caption, color: Colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: Spacing.xxl },
});
