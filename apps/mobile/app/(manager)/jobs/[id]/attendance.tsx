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

type ManagerStatus = 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE' | 'PENDING';
type WorkerStatus  = 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE' | null;

interface AttendanceRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_profile_id: string;
  // Manager-set status
  status: ManagerStatus;
  manager_status_at: string | null;
  // Worker self-reported
  worker_status: WorkerStatus;
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

function formatDuration(hours: number | null, minutes: number | null): string {
  if (hours == null && minutes == null) return '-';
  const h = hours ?? 0;
  const m = minutes ?? 0;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// ── Hours Picker Modal ──────────────────────────────────────────────────────

function HoursPickerModal({
  visible,
  workerName,
  initialHours,
  initialMinutes,
  onConfirm,
  onClose,
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
                  <TouchableOpacity
                    key={h}
                    style={[pk.option, hours === h && pk.optionActive]}
                    onPress={() => setHours(h)}
                  >
                    <Text style={[pk.optionText, hours === h && pk.optionTextActive]}>{h}시간</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={pk.col}>
              <Text style={pk.colLabel}>분</Text>
              {MIN_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[pk.option, minutes === m && pk.optionActive]}
                  onPress={() => setMinutes(m)}
                >
                  <Text style={[pk.optionText, minutes === m && pk.optionTextActive]}>{m}분</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={pk.actions}>
            <TouchableOpacity style={pk.cancelBtn} onPress={onClose}>
              <Text style={pk.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={pk.confirmBtn}
              onPress={() => { onConfirm(hours, minutes); onClose(); }}
            >
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
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outline, alignItems: 'center',
  },
  cancelText: { ...Font.t4, color: Colors.onSurfaceVariant },
  confirmBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  confirmText: { ...Font.t4, color: '#fff', fontWeight: '700' },
});

// ── Main Screen ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ManagerStatus; label: string; bg: string; text: string }[] = [
  { value: 'ATTENDED',    label: '출근',  bg: '#E8F5E9', text: '#2E7D32' },
  { value: 'ABSENT',      label: '결근',  bg: '#FFEBEE', text: '#C62828' },
  { value: 'EARLY_LEAVE', label: '조퇴',  bg: '#FFF3E0', text: '#E65100' },
  { value: 'PENDING',     label: '미확정', bg: Colors.primaryContainer, text: Colors.primary },
];

const WORKER_STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  ATTENDED:    { label: '출근', bg: '#E8F5E9', text: '#2E7D32' },
  ABSENT:      { label: '결근', bg: '#FFEBEE', text: '#C62828' },
  EARLY_LEAVE: { label: '조퇴', bg: '#FFF3E0', text: '#E65100' },
};

export default function AttendanceScreen() {
  const { t } = useTranslation();
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pickerRecord, setPickerRecord] = useState<AttendanceRecord | null>(null);

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

  async function handleStatusChange(recordId: string, status: ManagerStatus) {
    setUpdating(recordId);
    try {
      await api.put(`/attendance/${recordId}`, { status });
      setRecords(prev => prev.map(r =>
        r.id === recordId
          ? { ...r, status, manager_status_at: new Date().toISOString() }
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
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{t('attendance.no_records_manager', '배정된 근로자가 없습니다')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const currentStatus = item.status;
          const isUpdating = updating === item.id;
          const hasDuration = item.work_hours != null;
          const workerStatusCfg = item.worker_status ? WORKER_STATUS_LABEL[item.worker_status] : null;

          return (
            <View style={s.card}>
              {/* Worker name + worker self-reported status */}
              <View style={s.cardTop}>
                <View style={s.nameRow}>
                  <Text style={s.workerName}>{item.worker_name}</Text>
                  {isUpdating && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
                </View>
                {workerStatusCfg && (
                  <View style={s.workerStatusRow}>
                    <Text style={s.workerStatusLabel}>근로자:</Text>
                    <View style={[s.badge, { backgroundColor: workerStatusCfg.bg }]}>
                      <Text style={[s.badgeText, { color: workerStatusCfg.text }]}>{workerStatusCfg.label}</Text>
                    </View>
                    {item.worker_status_at && (
                      <Text style={s.timeText}>
                        {new Date(item.worker_status_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Manager status buttons */}
              <View style={s.statusRow}>
                {STATUS_OPTIONS.map(opt => {
                  const selected = currentStatus === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        s.statusBtn,
                        selected && { backgroundColor: opt.bg, borderColor: opt.text + '40' },
                      ]}
                      onPress={() => handleStatusChange(item.id, opt.value)}
                      disabled={isUpdating}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.statusBtnText, selected && { color: opt.text, fontWeight: '700' }]}>
                        {opt.label}
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
                  <TouchableOpacity
                    style={s.durationBtn}
                    onPress={() => setPickerRecord(item)}
                    disabled={isUpdating}
                  >
                    <Text style={s.durationBtnText}>{hasDuration ? '수정' : '입력'}</Text>
                  </TouchableOpacity>

                  {hasDuration && !item.work_duration_confirmed && (
                    <TouchableOpacity
                      style={[s.durationBtn, s.confirmBtn]}
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md, gap: 10, paddingBottom: 40 },
  listHeader: { marginBottom: 8 },
  headerTitle: { ...Font.t2, color: Colors.onSurface, fontWeight: '700' },
  headerDate: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { ...Font.t4, color: Colors.onSurfaceVariant },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, gap: 12,
    shadowColor: Colors.shadowBlack, shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  cardTop: { gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  workerName: { ...Font.t4, color: Colors.onSurface, fontWeight: '700' },

  workerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  workerStatusLabel: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  timeText: { ...Font.caption, color: Colors.onSurfaceVariant },

  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, paddingVertical: 9, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.outline,
    alignItems: 'center', backgroundColor: Colors.surfaceContainer,
  },
  statusBtnText: { fontSize: 13, color: Colors.onSurfaceVariant, fontWeight: '500' },

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
  confirmBtn: { backgroundColor: Colors.primary },
});
