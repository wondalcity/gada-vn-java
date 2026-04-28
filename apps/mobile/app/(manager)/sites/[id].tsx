import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../../constants/theme';
import { showToast } from '../../../lib/toast';

type SiteStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
type JobStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED';

interface SiteDetail {
  id: string;
  name: string;
  province: string;
  district?: string;
  address: string;
  status: SiteStatus;
  siteType?: string;
  jobCount?: number;
}

interface SiteJob {
  id: string;
  title: string;
  workDate: string;
  dailyWage: number;
  slotsTotal: number;
  slotsFilled: number;
  status: JobStatus;
}

const SITE_STATUS_CONFIG: Record<SiteStatus, { bg: string; text: string; label: string }> = {
  ACTIVE:    { bg: Colors.successContainer,  text: Colors.onSuccessContainer, label: '운영 중' },
  PAUSED:    { bg: Colors.secondaryContainer, text: Colors.onSecondary,       label: '일시 중지' },
  COMPLETED: { bg: Colors.surfaceContainer,  text: Colors.onSurface,          label: '완료' },
};

const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  OPEN: Colors.success, FILLED: Colors.secondary, CANCELLED: Colors.disabled, COMPLETED: Colors.primary,
};
const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  OPEN: '모집 중', FILLED: '마감', CANCELLED: '취소', COMPLETED: '완료',
};

export default function SiteDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [site, setSite] = useState<SiteDetail | null>(null);
  const [jobs, setJobs] = useState<SiteJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    try {
      const [siteData, jobsData] = await Promise.all([
        api.get<SiteDetail>(`/manager/sites/${id}`),
        api.get<SiteJob[]>(`/manager/sites/${id}/jobs`),
      ]);
      setSite(siteData);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch {
      showToast({ message: t('common.load_fail', '정보를 불러오지 못했습니다'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(newStatus: SiteStatus) {
    setStatusModalVisible(false);
    setUpdatingStatus(true);
    try {
      await api.patch(`/manager/sites/${id}/status`, { status: newStatus });
      setSite(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch {
      showToast({ message: t('common.process_fail', '처리 중 오류가 발생했습니다'), type: 'error' });
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!site) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{t('common.load_fail')}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={load}>
          <Text style={s.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = SITE_STATUS_CONFIG[site.status] ?? SITE_STATUS_CONFIG.ACTIVE;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Site Info Card */}
      <View style={s.infoCard}>
        <View style={s.infoHeader}>
          <View style={s.iconBox}>
            <Text style={{ fontSize: 24 }}>🏗️</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.siteName}>{site.name}</Text>
            <Text style={s.siteAddress}>{site.province}{site.district ? ` · ${site.district}` : ''}</Text>
            {site.address ? <Text style={s.siteAddressSub} numberOfLines={2}>{site.address}</Text> : null}
          </View>
        </View>

        {site.siteType && (
          <View style={s.typeRow}>
            <Text style={s.typeLabel}>{t('manager.site_type')}</Text>
            <Text style={s.typeValue}>{site.siteType}</Text>
          </View>
        )}

        {/* Status + actions row */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.statusBtn, { backgroundColor: statusCfg.bg }]}
            onPress={() => setStatusModalVisible(true)}
            disabled={updatingStatus}
          >
            {updatingStatus
              ? <ActivityIndicator size="small" color={statusCfg.text} />
              : <Text style={[s.statusBtnText, { color: statusCfg.text }]}>
                  {statusCfg.label} ▾
                </Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={s.addJobBtn}
            onPress={() => router.push({ pathname: '/(manager)/jobs/create', params: { siteId: site.id } })}
            activeOpacity={0.85}
          >
            <Text style={s.addJobBtnText}>+ {t('manager.add_job')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Jobs section */}
      <View style={s.sectionLabel}>
        <Text style={s.sectionTitle}>{t('manager.site_jobs_title')}</Text>
        <Text style={s.sectionCount}>{jobs.length}</Text>
      </View>

      {jobs.length === 0 ? (
        <View style={s.emptyJobs}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyText}>{t('manager.site_no_jobs')}</Text>
          <TouchableOpacity
            style={s.addJobBtnLarge}
            onPress={() => router.push({ pathname: '/(manager)/jobs/create', params: { siteId: site.id } })}
          >
            <Text style={s.addJobBtnText}>+ {t('manager.add_job')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.jobList}>
          {jobs.map(job => {
            const color = JOB_STATUS_COLOR[job.status] ?? Colors.onSurfaceVariant;
            return (
              <TouchableOpacity
                key={job.id}
                style={s.jobCard}
                onPress={() => router.push({ pathname: '/(manager)/jobs/[id]', params: { id: job.id } })}
                activeOpacity={0.8}
              >
                <View style={s.jobCardHeader}>
                  <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
                  <View style={[s.jobBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[s.jobBadgeText, { color }]}>{JOB_STATUS_LABEL[job.status] ?? job.status}</Text>
                  </View>
                </View>
                <Text style={s.jobDate}>
                  📅 {new Date(job.workDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </Text>
                <View style={s.jobFooter}>
                  <Text style={s.jobWage}>₫{new Intl.NumberFormat('ko-KR').format(job.dailyWage)}</Text>
                  <Text style={s.jobSlots}>
                    {t('jobs.slots_count', { filled: job.slotsFilled, total: job.slotsTotal })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Status change modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setStatusModalVisible(false)}>
          <View style={s.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('manager.site_status_change')}</Text>
            {(Object.keys(SITE_STATUS_CONFIG) as SiteStatus[]).map(status => {
              const cfg = SITE_STATUS_CONFIG[status];
              const isActive = site.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[s.statusOption, isActive && s.statusOptionActive]}
                  onPress={() => handleStatusChange(status)}
                  activeOpacity={0.7}
                >
                  <View style={[s.statusDot, { backgroundColor: cfg.text }]} />
                  <Text style={[s.statusOptionText, isActive && { color: Colors.primary, fontWeight: '700' }]}>
                    {cfg.label}
                  </Text>
                  {isActive && <Text style={s.statusCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  errorText: { ...Font.body2, color: Colors.onSurfaceVariant },
  retryBtn: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, backgroundColor: Colors.primary,
  },
  retryText: { ...Font.body3, color: Colors.onPrimary, fontWeight: '700' },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: Colors.shadowBlack, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  infoHeader: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  iconBox: {
    width: 52, height: 52, borderRadius: Radius.sm,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  siteName: { ...Font.t3, color: Colors.onSurface, fontWeight: '700' },
  siteAddress: { ...Font.body3, color: Colors.primary, fontWeight: '600' },
  siteAddressSub: { ...Font.caption, color: Colors.onSurfaceVariant },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typeLabel: { ...Font.caption, color: Colors.onSurfaceVariant },
  typeValue: { ...Font.body3, color: Colors.onSurface, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  statusBtnText: { ...Font.body3, fontWeight: '700' },
  addJobBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.pill,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  addJobBtnLarge: {
    marginTop: Spacing.sm, paddingVertical: 12, paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill, backgroundColor: Colors.primary,
  },
  addJobBtnText: { ...Font.t4, color: Colors.onPrimary, fontWeight: '700' },

  sectionLabel: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: { ...Font.t4, color: Colors.onSurface, flex: 1 },
  sectionCount: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 2,
    ...Font.caption, color: Colors.primary, fontWeight: '700',
  },

  emptyJobs: { alignItems: 'center', paddingVertical: 40, gap: Spacing.sm },
  emptyIcon: { fontSize: 36 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant },

  jobList: { gap: Spacing.sm },
  jobCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: 6,
    shadowColor: Colors.shadowBlack, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTitle: { flex: 1, ...Font.t4, color: Colors.onSurface, marginRight: 8 },
  jobBadge: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  jobBadgeText: { ...Font.caption, fontWeight: '700' },
  jobDate: { ...Font.caption, color: Colors.onSurfaceVariant },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobWage: { ...Font.t4, color: Colors.primary },
  jobSlots: { ...Font.caption, color: Colors.onSurfaceVariant },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay30, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40, gap: Spacing.sm,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.outline, alignSelf: 'center', marginBottom: Spacing.sm,
  },
  modalTitle: { ...Font.t4, color: Colors.onSurface, textAlign: 'center', marginBottom: Spacing.sm },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceContainer,
  },
  statusOptionActive: { backgroundColor: Colors.primaryContainer },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { ...Font.body2, color: Colors.onSurface, flex: 1 },
  statusCheck: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
});
