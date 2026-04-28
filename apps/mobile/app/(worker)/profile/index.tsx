import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api-client';
import { useAuthStore } from '../../../store/auth.store';
import { setCurrentScreen } from '../../../lib/crashlytics';
import { Colors } from '../../../constants/theme';
import { showToast } from '../../../lib/toast';

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

function formatWage(n: number | null | undefined) {
  if (n == null) return '-';
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫';
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

interface Application {
  id: string;
  jobId: string;
  jobTitle?: string;
  siteName?: string;
  workDate?: string;
  dailyWage?: number;
  status: string;
  contractId?: string;
}

interface WorkerInfo {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  APPLIED:    { label: '지원 중',  bg: '#FFF8E6', text: '#92620A' },
  PENDING:    { label: '지원 중',  bg: '#FFF8E6', text: '#92620A' },
  HIRED:      { label: '채용됨',   bg: '#E6F9E6', text: '#1A6B1A' },
  ACCEPTED:   { label: '채용됨',   bg: '#E6F9E6', text: '#1A6B1A' },
  COMPLETED:  { label: '완료',     bg: Colors.primaryContainer, text: Colors.primaryDark },
  CONTRACTED: { label: '계약 중',  bg: Colors.primaryContainer, text: Colors.primaryDark },
  REJECTED:   { label: '불합격',   bg: '#FDE8EE', text: '#ED1C24' },
  WITHDRAWN:  { label: '취소',     bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant },
};

export default function WorkerMyPageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isManager } = useAuthStore();
  const [worker, setWorker] = useState<WorkerInfo>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [managerStatus, setManagerStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NONE');
  const [applyingManager, setApplyingManager] = useState(false);

  useEffect(() => { setCurrentScreen('worker/mypage'); }, []);

  const load = useCallback(async () => {
    try {
      const [workerRes, appsRes, statusRes] = await Promise.all([
        api.get<WorkerInfo>('/workers/me').catch(() => ({} as WorkerInfo)),
        api.get<Application[]>('/applications/mine').catch(() => [] as Application[]),
        api.get<{ status?: string }>('/managers/registration-status').catch(() => ({ status: 'NONE' })),
      ]);
      setWorker(workerRes ?? {});
      setApplications(Array.isArray(appsRes) ? appsRes : []);
      const st = (statusRes as any)?.status ?? 'NONE';
      setManagerStatus(st === 'PENDING' ? 'PENDING' : st === 'APPROVED' ? 'APPROVED' : st === 'REJECTED' ? 'REJECTED' : 'NONE');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  async function handleApplyManager() {
    setApplyingManager(true);
    try {
      await api.post('/managers/register', {});
      setManagerStatus('PENDING');
      showToast({
        message: t('worker.manager_apply_success_body', '관리자 신청이 접수되었습니다. 검토 후 승인됩니다.'),
        type: 'success',
      });
    } catch {
      showToast({ message: t('common.process_fail', '처리 중 오류가 발생했습니다'), type: 'error' });
    } finally {
      setApplyingManager(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  const displayName = worker.full_name ?? worker.phone ?? t('worker.name_unregistered', '근로자');
  const initial = displayName.charAt(0).toUpperCase();

  const counts = {
    pending:  applications.filter(a => a.status === 'APPLIED' || a.status === 'PENDING').length,
    accepted: applications.filter(a => ['HIRED', 'COMPLETED', 'ACCEPTED', 'CONTRACTED'].includes(a.status)).length,
    rejected: applications.filter(a => a.status === 'REJECTED' || a.status === 'WITHDRAWN').length,
  };

  const recent = applications.slice(0, 5);

  const quickActions = [
    { icon: '📋', label: t('worker.dashboard_applications', '지원현황'), onPress: () => router.push('/(worker)/work' as never) },
    { icon: '📄', label: t('worker.dashboard_contracts', '계약서'), onPress: () => router.push('/(worker)/contracts/' as never) },
    { icon: '👤', label: t('worker.dashboard_profile', '프로필'), onPress: () => router.push('/(worker)/profile/edit' as never) },
    { icon: '🔍', label: t('worker.dashboard_find_jobs', '일자리'), onPress: () => router.push('/(worker)/' as never) },
  ];

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          colors={[Colors.primary]}
        />
      }
    >
      {/* ── Blue profile card (matches web-next mobile) ── */}
      <View style={s.profileCard}>
        {/* Decoration circles */}
        <View style={s.decor1} />
        <View style={s.decor2} />

        {/* Profile row */}
        <View style={s.profileRow}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>{initial}</Text>
          </View>
          <View style={s.profileInfo}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>{displayName}</Text>
              <TouchableOpacity onPress={() => router.push('/(worker)/settings' as never)} activeOpacity={0.7}>
                <Text style={s.settingsIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>
            {worker.phone && <Text style={s.phone}>{formatPhone(worker.phone)}</Text>}
            <View style={s.badges}>
              <View style={s.badge}>
                <Text style={s.badgeText}>{t('worker.dashboard_role_worker', '근로자')}</Text>
              </View>
              {isManager && (
                <View style={[s.badge, s.badgeManager]}>
                  <Text style={[s.badgeText, s.badgeManagerText]}>{t('worker.dashboard_role_manager', '관리자')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Inline stats */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{counts.pending}</Text>
            <Text style={s.statLabel}>{t('worker.dashboard_stat_pending', '지원 중')}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{counts.accepted}</Text>
            <Text style={s.statLabel}>{t('worker.dashboard_stat_accepted', '채용됨')}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{counts.rejected}</Text>
            <Text style={s.statLabel}>{t('worker.dashboard_stat_rejected', '불합격')}</Text>
          </View>
        </View>

        {/* Manager controls */}
        {isManager ? (
          <TouchableOpacity
            style={s.managerBtn}
            onPress={() => router.navigate('/(manager)/' as never)}
            activeOpacity={0.8}
          >
            <Text style={s.managerBtnText}>{t('worker.switch_to_manager', '관리자 모드로 전환')}</Text>
          </TouchableOpacity>
        ) : managerStatus === 'PENDING' ? (
          <View style={s.managerPendingBadge}>
            <Text style={s.managerPendingText}>⏳ {t('worker.manager_apply_pending', '관리자 신청 검토 중')}</Text>
          </View>
        ) : managerStatus === 'NONE' || managerStatus === 'REJECTED' ? (
          <TouchableOpacity
            style={s.managerApplyBtn}
            onPress={handleApplyManager}
            disabled={applyingManager}
            activeOpacity={0.8}
          >
            {applyingManager ? (
              <ActivityIndicator size="small" color="#0669F7" />
            ) : (
              <Text style={s.managerApplyBtnText}>
                {managerStatus === 'REJECTED'
                  ? t('worker.manager_apply_again', '관리자 재신청하기')
                  : t('worker.manager_apply', '관리자로 신청하기')}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Quick actions grid ── */}
      <View style={s.quickActions}>
        {quickActions.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={s.quickAction} onPress={onPress} activeOpacity={0.8}>
            <Text style={s.quickActionIcon}>{icon}</Text>
            <Text style={s.quickActionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Recent applications ── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{t('worker.dashboard_recent', '최근 지원 내역')}</Text>
          <TouchableOpacity onPress={() => router.push('/(worker)/work' as never)}>
            <Text style={s.viewAll}>{t('common.view_all', '전체 보기')}</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>{t('worker.dashboard_empty_title', '지원 내역이 없습니다')}</Text>
            <Text style={s.emptySubtitle}>{t('worker.dashboard_empty_sub', '일자리를 찾아 지원해 보세요')}</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push('/(worker)/' as never)}
              activeOpacity={0.85}
            >
              <Text style={s.emptyBtnText}>{t('worker.dashboard_find_jobs', '일자리 찾기')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.appList}>
            {recent.map(app => {
              const cfg = STATUS_CONFIG[app.status] ?? { label: app.status, bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant };
              return (
                <TouchableOpacity
                  key={app.id}
                  style={s.appCard}
                  onPress={() => router.push({ pathname: '/(worker)/jobs/[id]', params: { id: app.jobId } })}
                  activeOpacity={0.8}
                >
                  <View style={s.appCardMain}>
                    <View style={s.appCardInfo}>
                      <Text style={s.appJobTitle} numberOfLines={1}>{app.jobTitle ?? '-'}</Text>
                      <Text style={s.appMeta}>
                        {app.siteName ?? ''}
                        {app.workDate ? ` · ${formatDateShort(app.workDate)}` : ''}
                      </Text>
                      {app.dailyWage ? (
                        <Text style={s.appWage}>{formatWage(app.dailyWage)}</Text>
                      ) : null}
                    </View>
                    <View style={[s.appBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.appBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {applications.length > 5 && (
              <TouchableOpacity
                style={s.viewMoreBtn}
                onPress={() => router.push('/(worker)/work' as never)}
                activeOpacity={0.8}
              >
                <Text style={s.viewMoreText}>
                  {t('worker.dashboard_view_more', `+${applications.length - 5}개 더 보기`)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Profile card (blue bg matching web-next)
  profileCard: {
    backgroundColor: Colors.primary,
    margin: 16,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  decor1: {
    position: 'absolute', right: 0, top: 0,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ translateX: 33 }, { translateY: -33 }],
  },
  decor2: {
    position: 'absolute', right: 30, bottom: 0,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ translateY: 32 }],
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, position: 'relative' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  settingsIcon: { fontSize: 16, opacity: 0.7 },
  phone: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  badgeManager: { backgroundColor: '#FFC72C' },
  badgeManagerText: { color: '#3C2C02' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 16, position: 'relative',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 28 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  managerBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  managerBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  managerApplyBtn: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', minHeight: 38, justifyContent: 'center',
  },
  managerApplyBtnText: { color: '#0669F7', fontSize: 13, fontWeight: '700' },
  managerPendingBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  managerPendingText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16, gap: 8,
    marginBottom: 12,
  },
  quickAction: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#EFF1F5',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickActionIcon: { fontSize: 20 },
  quickActionLabel: { fontSize: 11, fontWeight: '500', color: '#4B5563', textAlign: 'center' },

  // Recent applications section
  section: {
    backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 16, padding: 16, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#25282A' },
  viewAll: { fontSize: 13, color: Colors.primary, fontWeight: '500' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#25282A' },
  emptySubtitle: { fontSize: 12, color: '#98A2B2', textAlign: 'center' },
  emptyBtn: {
    marginTop: 4, backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999,
  },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Application cards
  appList: { gap: 8 },
  appCard: {
    backgroundColor: '#F8F9FC', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#EFF1F5',
  },
  appCardMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appCardInfo: { flex: 1, gap: 2 },
  appJobTitle: { fontSize: 14, fontWeight: '600', color: '#25282A' },
  appMeta: { fontSize: 12, color: '#98A2B2' },
  appWage: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  appBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  appBadgeText: { fontSize: 11, fontWeight: '700' },
  viewMoreBtn: {
    marginTop: 4, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.primaryContainer,
    borderRadius: 12, alignItems: 'center',
    backgroundColor: '#fff',
  },
  viewMoreText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
