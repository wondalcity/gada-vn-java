import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api-client';
import { setCurrentScreen } from '../../lib/crashlytics';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

interface DashboardStats {
  openJobs: number;
  activeSites: number;
  pendingApplications: number;
}

export default function ManagerHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats>({ openJobs: 0, activeSites: 0, pendingApplications: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setCurrentScreen('manager/home'); }, []);

  const loadStats = async () => {
    try {
      const data = await api.get<DashboardStats>('/manager/dashboard');
      if (data) setStats(data);
    } catch {
      // Silently ignore — show zeroes
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const quickActions = [
    { icon: '🏗️', label: t('manager.tab_sites_label'), route: '/(manager)/sites' },
    { icon: '📋', label: t('manager.tab_jobs_label'), route: '/(manager)/' },
    { icon: '👷', label: t('manager.tab_workers_label'), route: '/(manager)/workers' },
    { icon: '📄', label: t('manager.tab_contracts_label'), route: '/(manager)/contracts' },
  ] as const;

  const menuItems = [
    {
      icon: '🏗️',
      title: t('manager.tab_sites'),
      desc: t('manager.home_site_desc', 'Register and manage construction sites'),
      badge: stats.activeSites > 0 ? `${stats.activeSites} ${t('manager.stat_sites_unit', 'sites')}` : undefined,
      route: '/(manager)/sites',
    },
    {
      icon: '📋',
      title: t('manager.tab_jobs'),
      desc: t('manager.home_job_desc', 'Post, edit, and close job listings'),
      badge: stats.openJobs > 0 ? `Open ${stats.openJobs}` : undefined,
      route: '/(manager)/',
    },
    {
      icon: '👷',
      title: t('manager.tab_workers'),
      desc: t('manager.home_hire_desc', 'Review applicants and process hires'),
      badge: stats.pendingApplications > 0 ? `${stats.pendingApplications}` : undefined,
      route: '/(manager)/workers',
    },
    {
      icon: '📄',
      title: t('manager.tab_contracts'),
      desc: t('manager.home_contract_desc', 'Electronic contracts and signing status'),
      route: '/(manager)/contracts',
    },
  ] as const;

  return (
    <View style={styles.root}>
      {/* Custom header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerLogo}>
          <Text style={styles.headerLogoSub}>가다</Text>
          <View style={styles.headerLogoRow}>
            <Text style={styles.headerLogoMain}>GADA</Text>
            <Text style={styles.headerLogoVn}>vn</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => {}}>
            <Text style={{ fontSize: 20 }}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => {}}>
            <Text style={{ fontSize: 20 }}>🇻🇳</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => {}}>
            <Text style={{ fontSize: 20 }}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(manager)/notifications')}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadStats(); }}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>M</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.profileName}>Manager</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Manager</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(manager)/settings')}>
              <Text style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>⚙</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.activeSites}</Text>
              <Text style={styles.statLabel}>{t('manager.stat_active_sites', 'Active Sites')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.openJobs}</Text>
              <Text style={styles.statLabel}>{t('manager.stat_open_jobs', 'Open Jobs')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pendingApplications}</Text>
              <Text style={styles.statLabel}>{t('manager.stat_pending_review', 'Pending Review')}</Text>
            </View>
          </View>
        </View>

        {/* ── Quick action grid ── */}
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Switch to Worker View ── */}
        <View style={styles.switchWrap}>
          <TouchableOpacity style={styles.switchBtn} onPress={() => router.replace('/(worker)')} activeOpacity={0.8}>
            <Text style={styles.switchBtnIcon}>👤</Text>
            <Text style={styles.switchBtnText}>{t('manager.home_switch_worker', 'Switch to Worker View')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── "View My Sites & Jobs" banner ── */}
        <View style={styles.bannerWrap}>
          <TouchableOpacity style={styles.banner} onPress={() => router.push('/(worker)')} activeOpacity={0.85}>
            <View style={styles.bannerIcon}>
              <Text style={{ fontSize: 22 }}>💼</Text>
            </View>
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>{t('manager.home_view_sites_jobs', 'View My Sites & Jobs')}</Text>
              <Text style={styles.bannerDesc}>{t('manager.home_view_sites_jobs_desc', "Check your postings from the worker's perspective")}</Text>
            </View>
            <Text style={styles.bannerArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Menu list ── */}
        <View style={styles.menuList}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.title}
              style={[styles.menuItem, idx === menuItems.length - 1 && styles.menuItemLast]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              </View>
              <View style={styles.menuBody}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              {item.badge && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.badge}</Text>
                </View>
              )}
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  // ── Custom header ──
  header: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  headerLogo: { flexDirection: 'column' },
  headerLogoSub: { fontSize: 9, color: Colors.primary, fontWeight: '700', letterSpacing: 1.5, lineHeight: 12 },
  headerLogoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  headerLogoMain: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  headerLogoVn: { fontSize: 13, color: Colors.onSurfaceVariant },
  headerActions: { flexDirection: 'row', gap: 2 },
  headerBtn: { padding: 6 },

  // ── Profile card ──
  profileCard: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileMeta: { flex: 1, gap: 4 },
  profileName: { ...Font.t3, color: '#fff' },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  roleBadgeText: { ...Font.caption, color: Colors.onSecondary, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Font.t2, color: '#fff' },
  statLabel: { ...Font.caption, color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

  // ── Quick grid ──
  quickGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  quickIcon: { fontSize: 26 },
  quickLabel: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },

  // ── Switch button ──
  switchWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  switchBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.outline,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  switchBtnIcon: { fontSize: 16 },
  switchBtnText: { ...Font.body3, color: Colors.onSurface, fontWeight: '600' },

  // ── Banner ──
  bannerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  banner: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bannerIcon: {
    width: 44, height: 44, borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerBody: { flex: 1 },
  bannerTitle: { ...Font.t4, color: '#fff' },
  bannerDesc: { ...Font.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  bannerArrow: { fontSize: 22, color: '#fff' },

  // ── Menu list ──
  menuList: {
    backgroundColor: Colors.surface,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.outline,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconBox: {
    width: 44, height: 44, borderRadius: Radius.sm,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  menuBody: { flex: 1 },
  menuTitle: { ...Font.t4, color: Colors.onSurface },
  menuDesc: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  menuBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  menuBadgeText: { ...Font.caption, color: Colors.primary, fontWeight: '700' },
  menuArrow: { fontSize: 20, color: Colors.onSurfaceVariant },
});
