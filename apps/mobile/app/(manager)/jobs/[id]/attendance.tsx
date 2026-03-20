import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../../../lib/api-client';

type AttendanceStatus = 'ATTENDED' | 'ABSENT' | 'HALF_DAY' | 'PENDING';

interface AttendanceRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_profile_id: string;
  status: AttendanceStatus;
  work_date: string;
  notes: string | null;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'ATTENDED', label: '출근', color: '#4CAF50' },
  { value: 'ABSENT', label: '결근', color: '#F44336' },
  { value: 'HALF_DAY', label: '반일', color: '#FF9800' },
  { value: 'PENDING', label: '미확인', color: '#9E9E9E' },
];

export default function AttendanceScreen() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<string, AttendanceStatus>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.get<AttendanceRecord[]>(`/jobs/${jobId}/attendance`);
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(recordId: string, status: AttendanceStatus) {
    setPendingStatus((s) => ({ ...s, [recordId]: status }));
    setUpdating(recordId);
    try {
      await api.put(`/attendance/${recordId}`, { status });
      setRecords((prev) => prev.map((r) => r.id === recordId ? { ...r, status } : r));
    } catch {
      Alert.alert('오류', '상태 업데이트에 실패했습니다.');
      // revert
      setPendingStatus((s) => {
        const next = { ...s };
        delete next[recordId];
        return next;
      });
    } finally {
      setUpdating(null);
    }
  }

  async function handleBulkConfirm() {
    const changes = Object.entries(pendingStatus);
    if (changes.length === 0) {
      Alert.alert('알림', '변경된 항목이 없습니다.');
      return;
    }

    Alert.alert(
      '일괄 저장',
      `${changes.length}개 항목을 저장하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: async () => {
            const workDate = records[0]?.work_date ?? new Date().toISOString().split('T')[0];
            const bulkRecords = changes.map(([, status]) => {
              const record = records.find((r) => pendingStatus[r.id] === status);
              return {
                workerId: record?.worker_profile_id ?? '',
                workDate,
                status,
              };
            });
            try {
              await api.post(`/jobs/${jobId}/attendance/bulk`, { records: bulkRecords });
              setPendingStatus({});
              load();
              Alert.alert('저장 완료', '출역 현황이 저장되었습니다.');
            } catch {
              Alert.alert('오류', '저장에 실패했습니다.');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerTitle}>출역 현황</Text>
            {records[0]?.work_date && (
              <Text style={styles.headerDate}>
                {new Date(records[0].work_date).toLocaleDateString('ko-KR', {
                  month: 'long', day: 'numeric', weekday: 'short',
                })}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>출역 기록이 없습니다</Text>
          </View>
        }
        renderItem={({ item }) => {
          const currentStatus = pendingStatus[item.id] ?? item.status;
          const isUpdating = updating === item.id;
          const statusOption = STATUS_OPTIONS.find((o) => o.value === currentStatus);

          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.workerName}>{item.worker_name}</Text>
                {isUpdating && <ActivityIndicator size="small" color="#FF6B2C" />}
              </View>

              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusBtn,
                      currentStatus === option.value && {
                        backgroundColor: option.color,
                        borderColor: option.color,
                      },
                    ]}
                    onPress={() => handleStatusChange(item.id, option.value)}
                    disabled={isUpdating}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        currentStatus === option.value && styles.statusBtnTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }}
      />

      {Object.keys(pendingStatus).length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.pendingCount}>
            {Object.keys(pendingStatus).length}개 변경됨
          </Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleBulkConfirm}>
            <Text style={styles.saveBtnText}>일괄 저장</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 80 },
  listHeader: { marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  headerDate: { fontSize: 13, color: '#888', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workerName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#E0E0E0',
    alignItems: 'center', backgroundColor: '#F8F8F8',
  },
  statusBtnText: { fontSize: 13, color: '#666', fontWeight: '600' },
  statusBtnTextActive: { color: '#fff' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  pendingCount: { flex: 1, fontSize: 14, color: '#FF6B2C', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#FF6B2C', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
