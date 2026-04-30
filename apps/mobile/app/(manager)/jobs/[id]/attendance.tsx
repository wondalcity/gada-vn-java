import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../lib/api-client';
import { showToast } from '../../../../lib/toast';
import { Colors, Spacing, Radius, Font } from '../../../../constants/theme';

type AttendanceStatus =
  | 'PENDING' | 'PRE_CONFIRMED' | 'COMMUTING' | 'WORK_STARTED'
  | 'WORK_COMPLETED' | 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE';

interface HistoryEntry {
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
  worker_id: string;
  worker_name: string;
  worker_profile_id: string;
  // Current unified status
  status: AttendanceStatus;
  updated_by_role: 'WORKER' | 'MANAGER' | 'SYSTEM' | null;
  manager_status_at: string | null;
  // Worker self-reported
  worker_status: AttendanceStatus | null;
  worker_status_at: string | null;
  // Work duration
  work_hours: number | null;
  work_minutes: number | null;
  work_duration_set_by: 'WORKER' | 'MANAGER' | null;
  work_duration_confirmed: boolean;
  work_duration_confirmed_at: string | null;
  work_date: string;
  notes: string | null;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: string; bg: string; text: string }> = {
  PENDING:        { label: '미확정',    icon: '⏳', bg: '#F5F5F5',  text: '#757575' },
  PRE_CONFIRMED:  { label: '출근 예정', icon: '✅', bg: '#E3F2FD',  text: '#1565C0' },
  COMMUTING:      { label: '출근 중',   icon: '🚌', bg: '#FFF3E0',  text: '#E65100' },
  WORK_STARTED:   { label: '작업 시작', icon: '⚒️', bg: '#E8F5E9',  text: '#2E7D32' },
  WORK_COMPLETED: { label: '작업 마감', icon: '🏁', bg: '#F3E5F5',  text: '#6A1B9A' },
  ATTENDED:       { label: '출근 확정', icon: '✓',  bg: '#C8E6C9',  text: '#1B5E20' },
  ABSENT:         { label: '결근',      icon: '✗',  bg: '#FFCDD2',  text: '#B71C1C' },
  EARLY_LEAVE:    { label: '조퇴',      icon: '↩',  bg: '#FFE0B2',  text: '#BF360C' },
};

// Status options a manager can directly set
const MANAGER_STATUS_OPTIONS: AttendanceStatus[] = [
  'PENDING', 'PRE_CONFIRMED', 'COMMUTING', 'WORK_STARTED', 'WORK_COMPLETED', 'ATTENDED', 'ABSENT', 'EARLY_LEAVE',
];

function formatDuration(hours: number | null, minutes: number | null): string {
  if (hours == null && minutes == null) return '-';
  const h = hours ?? 0;
  const m = minutes ?? 0;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

// ── Status History Timeline ─────────────────────────────────────────────────

function HistoryTimeline({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <View style={ht.empty}>
        <Text style={ht.emptyText}>이력 없음</Text>
      </View>
    );
  }
  return (
    <View style={ht.container}>
      {history.map((entry, idx) => {
        const cfg = STATUS_CONFIG[entry.newStatus as AttendanceStatus];
        const roleLbl = entry.changedByRole === 'WORKER' ? '근로자' : entry.changedByRole === 'MANAGER' ? '관리자' : '시스템';
        const roleBg  = entry.changedByRole === 'WORKER' ? '#E3F2FD' : entry.changedByRole === 'MANAGER' ? '#F3E5F5' : '#F5F5F5';
        const roleClr = entry.changedByRole === 'WORKER' ? '#1565C0' : entry.changedByRole === 'MANAGER' ? '#6A1B9A' : '#616161';
        return (
          <View key={entry.id} style={ht.row}>
            <View style={ht.timelineCol}>
              <View style={[ht.dot, { backgroundColor: cfg?.bg ?? '#F5F5F5', borderColor: cfg?.text ?? '#9E9E9E' }]} />
              {idx < history.length - 1 && <View style={ht.line} />}
            </View>
            <View style={ht.content}>
              <View style={ht.statusRow}>
                <View style={[ht.badge, { backgroundColor: cfg?.bg ?? '#F5F5F5' }]}>
                  <Text style={[ht.badgeText, { color: cfg?.text ?? '#616161' }]}>{cfg?.icon ?? '•'} {cfg?.label ?? entry.newStatus}</Text>
                </View>
                {entry.oldStatus && STATUS_CONFIG[entry.oldStatus as AttendanceStatus] && (
                  <Text style={ht.fromText}>← {STATUS_CONFIG[entry.oldStatus as AttendanceStatus]?.label ?? entry.oldStatus}</Text>
                )}
              </View>
              <View style={ht.metaRow}>
                <View style={[ht.roleBadge, { backgroundColor: roleBg }]}>
                  <Text style={[ht.roleText, { color: roleClr }]}>{roleLbl}</Text>
                </View>
                {entry.changedByName && <Text style={ht.nameText}>{entry.changedByName}</Text>}
                <Text style={ht.timeText}>
                  {new Date(entry.changedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {entry.note && <Text style={ht.noteText}>{entry.note}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const ht = StyleSheet.create({
  container: { gap: 0 },
  empty: { alignItems: 'center', paddingVertical: 12 },
  emptyText: { ...Font.caption, color: Colors.onSurfaceVariant },
  row: { flexDirection: 'row', gap: 10 },
  timelineCol: { alignItems: 'center', width: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, marginTop: 3 },
  line: { width: 1, flex: 1, backgroundColor: Colors.outline, marginVertical: 2 },
  content: { flex: 1, paddingBottom: 12, gap: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  fromText: { fontSize: 10, color: Colors.onSurfaceVariant },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  roleBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  roleText: { fontSize: 10, fontWeight: '700' },
  nameText: { fontSize: 11, color: Colors.onSurfaceVariant },
  timeText: { fontSize: 10, color: Colors.onSurfaceVariant, marginLeft: 'auto' },
  noteText: { fontSize: 11, color: Colors.onSurfaceVariant, fontStyle: 'italic' },
});

// ── Hours Picker Modal ──────────────────────────────────────────────────────

function HoursPickerModal({
  visible, workerName, initialHours, initialMinutes, onConfirm, onClose,
}: {
  visible: boolean;
  workerName: string;
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
      <View style={pk.overlay}>
        <View style={pk.sheet}>
          <Text style={pk.title}>{workerName} 근무 시간</Text>
          <View style={pk.row}>
            <View style={pk.col}>
              <Text style={pk.colLabel}>시간</Text>
              <ScrollView style={pk.scroll} showsVerticalScrollIndicator={false}>
                {HOUR_OPTIONS.map(h => (
                  <TouchableOpacity key={h} style={[pk.option, hours === h && pk.optionActive]} onPress={() => setHours(h)}>
                    <Text style={[pk.optionText, hours === h && pk.optionTextActive]}>{h}시간</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={pk.col}>
              <Text style={pk.colLabel}>분</Text>
              {MIN_OPTIONS.map(m => (
                <TouchableOpacity key={m} style={[pk.option, minutes === m && pk.optionActive]} onPress={() => setMinutes(m)}>
                  <Text style={[pk.optionText, minutes === m && pk.optionTextActive]}>{m}분</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={pk.actions}>
            <TouchableOpacity style={pk.cancelBtn} onPress={onClose}>
              <Text style={pk.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pk.confirmBtn} onPress={() => { onConfirm(hours, minutes); onClose(); }}>
              <Text style={pk.confirmText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
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
    alignItems: 'center', marginBottom: 4, backgroundColor: Colors.surfaceContainer,
  },
  optionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { ...Font.caption, color: Colors.onSurface },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.outline, alignItems: 'center' },
  cancelText: { ...Font.t4, color: Colors.onSurfaceVariant },
  confirmBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  confirmText: { ...Font.t4, color: '#fff', fontWeight: '700' },
});

// ── History Modal ────────────────────────────────────────────────────────────

function HistoryModal({
  visible, record, onClose,
}: {
  visible: boolean;
  record: AttendanceRecord;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api.get<HistoryEntry[]>(`/attendance/${record.id}/history`)
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [visible, record.id]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={hm.overlay}>
        <View style={hm.sheet}>
          <View style={hm.header}>
            <Text style={hm.title}>{record.worker_name}</Text>
            <Text style={hm.subtitle}>상태 변경 이력</Text>
          </View>
          <ScrollView style={hm.body} showsVerticalScrollIndicator={false}>
            {loading
              ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
              : <HistoryTimeline history={history} />
            }
          </ScrollView>
          <TouchableOpacity style={hm.closeBtn} onPress={onClose}>
            <Text style={hm.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const hm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.lg, paddingBottom: 40, maxHeight: '70%',
  },
  header: { marginBottom: 12, gap: 2 },
  title: { ...Font.t3, color: Colors.onSurface, fontWeight: '700' },
  subtitle: { ...Font.caption, color: Colors.onSurfaceVariant },
  body: { flex: 1, marginBottom: 12 },
  closeBtn: {
    paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outline, alignItems: 'center',
  },
  closeBtnText: { ...Font.t4, color: Colors.onSurfaceVariant },
});

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const { t } = useTranslation();
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pickerRecord, setPickerRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecord, setHistoryRecord] = useState<AttendanceRecord | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<AttendanceRecord[]>(`/jobs/${jobId}/attendance`);
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(recordId: string, status: AttendanceStatus) {
    setUpdating(recordId);
    try {
      await api.put(`/attendance/${recordId}`, { status });
      setRecords(prev => prev.map(r =>
        r.id === recordId
          ? { ...r, status, updated_by_role: 'MANAGER', manager_status_at: new Date().toISOString() }
          : r,
      ));
    } catch {
      showToast({ message: t('attendance.status_update_fail', '출결 상태 업데이트에 실패했습니다'), type: 'error' });
    } finally {
      setUpdating(null);
    }
  }

  async function handleSetDuration(recordId: string, hours: number, minutes: number) {
    setUpdating(recordId);
    try {
      await api.put(`/attendance/${recordId}/work-duration`, { hours, minutes });
      setRecords(prev => prev.map(r =>
        r.id === recordId
          ? { ...r, work_hours: hours, work_minutes: minutes, work_duration_set_by: 'MANAGER', work_duration_confirmed: false }
          : r,
      ));
      showToast({ message: '근무 시간이 저장되었습니다', type: 'success' });
    } catch {
      showToast({ message: '근무 시간 저장에 실패했습니다', type: 'error' });
    } finally {
      setUpdating(null);
    }
  }

  async function handleConfirmDuration(recordId: string, workerName: string) {
    Alert.alert(
      '근무 시간 확정',
      `${workerName}의 근무 시간을 최종 확정하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확정',
          onPress: async () => {
            setUpdating(recordId);
            try {
              await api.post(`/attendance/${recordId}/work-duration/confirm`);
              setRecords(prev => prev.map(r =>
                r.id === recordId
                  ? { ...r, work_duration_confirmed: true, work_duration_confirmed_at: new Date().toISOString() }
                  : r,
              ));
              showToast({ message: '근무 시간이 확정되었습니다', type: 'success' });
            } catch {
              showToast({ message: '확정에 실패했습니다', type: 'error' });
            } finally {
              setUpdating(null);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const workDate = records[0]?.work_date
    ? new Date(records[0].work_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : null;

  return (
    <View style={s.container}>
      <FlatList
        data={records}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.listHeader}>
            <Text style={s.headerTitle}>{t('attendance.manage_title', '출퇴근 관리')}</Text>
            {workDate && <Text style={s.headerDate}>{workDate}</Text>}
            <Text style={s.headerHint}>근로자 상태 클릭으로 직접 변경 · 이력 버튼으로 상태 이력 확인</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{t('attendance.no_records_manager', '배정된 근로자가 없습니다')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUpdating = updating === item.id;
          const hasDuration = item.work_hours != null;
          const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
          const workerStatusCfg = item.worker_status ? STATUS_CONFIG[item.worker_status] : null;

          return (
            <View style={s.card}>
              {/* Worker header */}
              <View style={s.cardTop}>
                <View style={s.nameRow}>
                  <Text style={s.workerName}>{item.worker_name}</Text>
                  {isUpdating && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
                  <TouchableOpacity
                    style={s.historyBtn}
                    onPress={() => setHistoryRecord(item)}
                    disabled={isUpdating}
                  >
                    <Text style={s.historyBtnText}>이력</Text>
                  </TouchableOpacity>
                </View>

                {/* Current status display */}
                <View style={s.currentStatusRow}>
                  <View style={[s.statusBadgeLarge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={s.statusIcon}>{statusCfg.icon}</Text>
                    <Text style={[s.statusLabelLarge, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                  </View>
                  {item.updated_by_role && (
                    <Text style={s.updatedByText}>
                      {item.updated_by_role === 'WORKER' ? '근로자' : '관리자'} 입력
                      {item.manager_status_at ? ` · ${fmtTime(item.manager_status_at)}` : ''}
                    </Text>
                  )}
                </View>

                {/* Worker self-status (if different from main) */}
                {workerStatusCfg && item.worker_status !== item.status && (
                  <View style={s.workerStatusRow}>
                    <Text style={s.workerStatusLabel}>근로자 자가 입력:</Text>
                    <View style={[s.badge, { backgroundColor: workerStatusCfg.bg }]}>
                      <Text style={[s.badgeText, { color: workerStatusCfg.text }]}>
                        {workerStatusCfg.icon} {workerStatusCfg.label}
                      </Text>
                    </View>
                    {item.worker_status_at && (
                      <Text style={s.timeText}>{fmtTime(item.worker_status_at)}</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Manager status buttons */}
              <View style={s.statusGrid}>
                {MANAGER_STATUS_OPTIONS.map(opt => {
                  const cfg = STATUS_CONFIG[opt];
                  const selected = item.status === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        s.statusBtn,
                        selected && { backgroundColor: cfg.bg, borderColor: cfg.text + '60' },
                      ]}
                      onPress={() => handleStatusChange(item.id, opt)}
                      disabled={isUpdating}
                      activeOpacity={0.75}
                    >
                      <Text style={s.statusBtnIcon}>{cfg.icon}</Text>
                      <Text style={[s.statusBtnText, selected && { color: cfg.text, fontWeight: '700' }]}>
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Work duration */}
              <View style={s.durationRow}>
                <View style={s.durationInfo}>
                  {hasDuration ? (
                    <>
                      <Text style={s.durationValue}>{formatDuration(item.work_hours, item.work_minutes)}</Text>
                      <Text style={s.durationSetBy}>
                        ({item.work_duration_set_by === 'WORKER' ? '근로자 입력' : '관리자 입력'})
                      </Text>
                      {item.work_duration_confirmed
                        ? <View style={s.confirmedBadge}><Text style={s.confirmedText}>확정됨</Text></View>
                        : <View style={s.unconfirmedBadge}><Text style={s.unconfirmedText}>미확정</Text></View>
                      }
                    </>
                  ) : (
                    <Text style={s.noDurationText}>근무 시간 미입력</Text>
                  )}
                </View>

                <View style={s.durationActions}>
                  <TouchableOpacity style={s.durationBtn} onPress={() => setPickerRecord(item)} disabled={isUpdating}>
                    <Text style={s.durationBtnText}>{hasDuration ? '수정' : '입력'}</Text>
                  </TouchableOpacity>
                  {hasDuration && !item.work_duration_confirmed && (
                    <TouchableOpacity
                      style={[s.durationBtn, s.confirmDurationBtn]}
                      onPress={() => handleConfirmDuration(item.id, item.worker_name)}
                      disabled={isUpdating}
                    >
                      <Text style={[s.durationBtnText, { color: '#fff' }]}>확정</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {pickerRecord && (
        <HoursPickerModal
          visible={!!pickerRecord}
          workerName={pickerRecord.worker_name}
          initialHours={pickerRecord.work_hours ?? 8}
          initialMinutes={pickerRecord.work_minutes ?? 0}
          onConfirm={(h, m) => handleSetDuration(pickerRecord.id, h, m)}
          onClose={() => setPickerRecord(null)}
        />
      )}

      {historyRecord && (
        <HistoryModal
          visible={!!historyRecord}
          record={historyRecord}
          onClose={() => setHistoryRecord(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md, gap: 12, paddingBottom: 40 },
  listHeader: { marginBottom: 4, gap: 2 },
  headerTitle: { ...Font.t2, color: Colors.onSurface, fontWeight: '700' },
  headerDate: { ...Font.caption, color: Colors.onSurfaceVariant },
  headerHint: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { ...Font.t4, color: Colors.onSurfaceVariant },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, gap: 12,
    shadowColor: Colors.shadowBlack, shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  cardTop: { gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  workerName: { ...Font.t4, color: Colors.onSurface, fontWeight: '700', flex: 1 },
  historyBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.outline,
  },
  historyBtnText: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '600' },

  currentStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadgeLarge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusIcon: { fontSize: 14 },
  statusLabelLarge: { fontSize: 13, fontWeight: '700' },
  updatedByText: { fontSize: 11, color: Colors.onSurfaceVariant },

  workerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  workerStatusLabel: { fontSize: 11, color: Colors.onSurfaceVariant },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  timeText: { ...Font.caption, color: Colors.onSurfaceVariant },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainer,
  },
  statusBtnIcon: { fontSize: 13 },
  statusBtnText: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '500' },

  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  durationInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  durationValue: { ...Font.caption, color: Colors.onSurface, fontWeight: '700' },
  durationSetBy: { ...Font.caption, color: Colors.onSurfaceVariant },
  noDurationText: { ...Font.caption, color: Colors.onSurfaceVariant },
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

  durationActions: { flexDirection: 'row', gap: 6 },
  durationBtn: {
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center',
  },
  durationBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  confirmDurationBtn: { backgroundColor: Colors.primary },
});
