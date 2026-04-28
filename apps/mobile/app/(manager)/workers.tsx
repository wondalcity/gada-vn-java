import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  Linking, Alert, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';
import { showToast } from '../../lib/toast';

type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CONTRACTED';

interface WorkerApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  workDate: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  workerTrades: string[];
  experienceYears?: number;
  status: ApplicationStatus;
  contractId?: string;
  contractStatus?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const p = phone.trim();
  if (p.startsWith('+84')) {
    const d = p.slice(3);
    if (d.length === 9) return `+84 ${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  }
  if (p.startsWith('+82')) {
    const d = p.slice(3);
    if (d.length >= 9) return `+82 ${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(d.length - 4)}`;
  }
  return p;
}

export default function ManagerWorkersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [applications, setApplications] = useState<WorkerApplication[]>([]);

  const STATUS_CONFIG: Record<ApplicationStatus, { bg: string; text: string; label: string }> = {
    PENDING:    { bg: Colors.primaryContainer, text: Colors.primary,           label: t('manager.tab_filter_applied') },
    ACCEPTED:   { bg: Colors.successContainer, text: Colors.onSuccessContainer, label: t('manager.tab_filter_hired') },
    REJECTED:   { bg: Colors.errorContainer,   text: Colors.onErrorContainer,   label: t('manager.worker_reject_button') },
    CONTRACTED: { bg: '#E6F9E6',               text: '#1A6B1A',                 label: t('manager.tab_filter_completed') },
  };

  const TAB_FILTERS: { key: ApplicationStatus | 'ALL'; label: string }[] = [
    { key: 'ALL',        label: t('manager.tab_filter_all') },
    { key: 'PENDING',    label: t('manager.tab_filter_applied') },
    { key: 'ACCEPTED',   label: t('manager.tab_filter_hired') },
    { key: 'CONTRACTED', label: t('manager.tab_filter_completed') },
  ];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [selectedWorker, setSelectedWorker] = useState<WorkerApplication | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingContractFor, setCreatingContractFor] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      const data = await api.get<WorkerApplication[]>('/manager/applications');
      setApplications(Array.isArray(data) ? data : []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  async function handleHire(applicationId: string) {
    try {
      await api.patch(`/manager/applications/${applicationId}/accept`);
      loadApplications();
    } catch {
      showToast({ message: t('manager.worker_hire_fail', '채용 처리에 실패했습니다'), type: 'error' });
    }
  }

  async function handleReject(applicationId: string) {
    Alert.alert(t('manager.worker_reject_title'), t('manager.worker_reject_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('manager.worker_reject_button'), style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/manager/applications/${applicationId}/reject`);
            loadApplications();
          } catch {
            showToast({ message: t('manager.worker_reject_fail', '거절 처리에 실패했습니다'), type: 'error' });
          }
        },
      },
    ]);
  }

  async function handleCreateContract(applicationId: string) {
    setCreatingContractFor(applicationId);
    try {
      await api.post('/contracts/generate', { applicationId });
      loadApplications();
    } catch {
      showToast({ message: t('common.process_fail', '처리 중 오류가 발생했습니다'), type: 'error' });
    } finally {
      setCreatingContractFor(null);
    }
  }

  function handleCall(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  const filtered = (() => {
    let list = applications;
    if (activeFilter !== 'ALL') list = list.filter(a => a.status === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.workerName.toLowerCase().includes(q) ||
        a.workerPhone.includes(q) ||
        a.jobTitle.toLowerCase().includes(q),
      );
    }
    return list;
  })();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterBar}>
        {TAB_FILTERS.map(({ key, label }) => {
          const count = key === 'ALL'
            ? applications.length
            : applications.filter(a => a.status === key).length;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, activeFilter === key && styles.filterChipActive]}
              onPress={() => setActiveFilter(key)}
            >
              <Text style={[styles.filterChipText, activeFilter === key && styles.filterChipTextActive]}>
                {label}{count > 0 ? ` ${count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search box */}
      {applications.length > 0 && (
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('manager.worker_search_placeholder', '이름, 전화번호, 공고 검색')}
            placeholderTextColor={Colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApplications(); }} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👷</Text>
            <Text style={styles.emptyText}>{t('manager.worker_no_applicants')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] ?? { bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant, label: item.status };
          const isFullySigned = item.contractId && item.contractStatus === 'FULLY_SIGNED';
          return (
            <View style={styles.card}>
              {/* Worker info header */}
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setSelectedWorker(item)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {(item.workerName ?? '?').charAt(0)}
                  </Text>
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{item.workerName}</Text>
                  <Text style={styles.workerPhone}>{formatPhone(item.workerPhone)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
              </TouchableOpacity>

              {/* Trade chips */}
              {(item.workerTrades ?? []).length > 0 && (
                <View style={styles.chips}>
                  {(item.workerTrades ?? []).slice(0, 3).map((trade) => (
                    <View key={trade} style={styles.chip}>
                      <Text style={styles.chipText}>{trade}</Text>
                    </View>
                  ))}
                  {item.experienceYears !== undefined && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{t('manager.worker_experience', { years: item.experienceYears })}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Job reference */}
              <TouchableOpacity
                style={styles.jobRef}
                onPress={() => router.push({ pathname: '/(manager)/jobs/[id]', params: { id: item.jobId } })}
              >
                <Text style={styles.jobRefIcon}>🏗️</Text>
                <Text style={styles.jobRefText} numberOfLines={1}>
                  {item.jobTitle} · {formatDate(item.workDate)}
                </Text>
                <Text style={styles.jobRefArrow}>›</Text>
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item.workerPhone)}>
                  <Text style={styles.callBtnText}>{t('manager.worker_call_button')}</Text>
                </TouchableOpacity>

                {item.status === 'PENDING' && (
                  <>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                      <Text style={styles.rejectBtnText}>{t('manager.worker_reject_action')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.hireBtn} onPress={() => handleHire(item.id)}>
                      <Text style={styles.hireBtnText}>{t('manager.worker_hire_action')}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {item.status === 'ACCEPTED' && !isFullySigned && (
                  <TouchableOpacity
                    style={[styles.hireBtn, { flex: 2 }]}
                    onPress={() => handleCreateContract(item.id)}
                    disabled={creatingContractFor === item.id}
                  >
                    <Text style={styles.hireBtnText}>
                      {creatingContractFor === item.id ? t('common.loading') : '계약서 생성'}
                    </Text>
                  </TouchableOpacity>
                )}

                {(item.status === 'ACCEPTED' || item.status === 'CONTRACTED') && isFullySigned && item.contractId && (
                  <TouchableOpacity
                    style={[styles.hireBtn, { flex: 2, backgroundColor: '#1A6B1A' }]}
                    onPress={() => router.push({ pathname: '/(manager)/contracts/[id]', params: { id: item.contractId! } })}
                  >
                    <Text style={styles.hireBtnText}>계약서 보기</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* ── Worker Detail Modal ── */}
      {selectedWorker && (() => {
        const w = selectedWorker;
        const cfg = STATUS_CONFIG[w.status] ?? { bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant, label: w.status };
        return (
          <Modal
            visible={!!selectedWorker}
            transparent
            animationType="slide"
            onRequestClose={() => setSelectedWorker(null)}
          >
            <TouchableOpacity
              style={styles.detailOverlay}
              activeOpacity={1}
              onPress={() => setSelectedWorker(null)}
            >
              <View style={styles.detailSheet} onStartShouldSetResponder={() => true}>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{t('manager.worker_detail_title')}</Text>
                  <TouchableOpacity onPress={() => setSelectedWorker(null)}>
                    <Text style={styles.detailClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Avatar + name */}
                <View style={styles.detailProfile}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>{(w.workerName ?? '?').charAt(0)}</Text>
                  </View>
                  <Text style={styles.detailName}>{w.workerName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Phone */}
                <TouchableOpacity
                  style={styles.detailPhoneRow}
                  onPress={() => handleCall(w.workerPhone)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.detailPhoneIcon}>📞</Text>
                  <Text style={styles.detailPhoneText}>{formatPhone(w.workerPhone)}</Text>
                  <Text style={styles.detailPhoneArrow}>›</Text>
                </TouchableOpacity>

                {/* Trades + experience */}
                {((w.workerTrades ?? []).length > 0 || w.experienceYears !== undefined) && (
                  <View style={styles.chips}>
                    {(w.workerTrades ?? []).map((trade) => (
                      <View key={trade} style={styles.chip}>
                        <Text style={styles.chipText}>{trade}</Text>
                      </View>
                    ))}
                    {w.experienceYears !== undefined && (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{t('manager.worker_experience', { years: w.experienceYears })}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Job reference */}
                <TouchableOpacity
                  style={styles.jobRef}
                  onPress={() => {
                    setSelectedWorker(null);
                    router.push({ pathname: '/(manager)/jobs/[id]', params: { id: w.jobId } });
                  }}
                >
                  <Text style={styles.jobRefIcon}>🏗️</Text>
                  <Text style={styles.jobRefText} numberOfLines={1}>
                    {w.jobTitle} · {formatDate(w.workDate)}
                  </Text>
                  <Text style={styles.jobRefArrow}>›</Text>
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(w.workerPhone)}>
                    <Text style={styles.callBtnText}>{t('manager.worker_call_button')}</Text>
                  </TouchableOpacity>
                  {w.status === 'PENDING' && (
                    <>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => { setSelectedWorker(null); handleReject(w.id); }}
                      >
                        <Text style={styles.rejectBtnText}>{t('manager.worker_reject_action')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.hireBtn}
                        onPress={() => { setSelectedWorker(null); handleHire(w.id); }}
                      >
                        <Text style={styles.hireBtnText}>{t('manager.worker_hire_action')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceContainer,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  filterChipTextActive: { color: Colors.onPrimary },

  searchBox: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    ...Font.body3,
    color: Colors.onSurface,
  },

  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 32 },

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

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Font.t4, color: Colors.primary },
  workerInfo: { flex: 1 },
  workerName: { ...Font.t4, color: Colors.onSurface },
  workerPhone: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { ...Font.caption, fontWeight: '700' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: Colors.onSecondary },

  jobRef: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.xs,
    padding: Spacing.sm,
  },
  jobRefIcon: { fontSize: 12 },
  jobRefText: { ...Font.caption, color: Colors.onSurfaceVariant, flex: 1 },
  jobRefArrow: { fontSize: 14, color: Colors.onSurfaceVariant },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  callBtn: {
    flex: 1, paddingVertical: 9,
    borderRadius: Radius.xs,
    borderWidth: 1, borderColor: Colors.outline,
    alignItems: 'center',
  },
  callBtnText: { ...Font.body3, color: Colors.onSurface, fontWeight: '600' },
  rejectBtn: {
    paddingVertical: 9, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xs,
    borderWidth: 1, borderColor: Colors.error,
    alignItems: 'center',
  },
  rejectBtnText: { ...Font.body3, color: Colors.error, fontWeight: '600' },
  hireBtn: {
    paddingVertical: 9, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  hireBtnText: { ...Font.body3, color: Colors.onPrimary, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant },

  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 36,
    gap: Spacing.md,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailTitle: { ...Font.t3, color: Colors.onSurface },
  detailClose: { fontSize: 18, color: Colors.onSurfaceVariant, padding: 4 },
  detailProfile: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  detailAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  detailAvatarText: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  detailName: { ...Font.t2, color: Colors.onSurface },
  detailPhoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.xs,
    padding: Spacing.md,
  },
  detailPhoneIcon: { fontSize: 16 },
  detailPhoneText: { ...Font.body2, color: Colors.primary, flex: 1, fontWeight: '600' },
  detailPhoneArrow: { fontSize: 16, color: Colors.onSurfaceVariant },
});
