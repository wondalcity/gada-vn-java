import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { setCurrentScreen } from '../../lib/crashlytics';

interface DashboardStats {
  openJobs: number;
  activeSites: number;
  pendingApplications: number;
  activeContracts: number;
}

export default function ManagerHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ openJobs: 0, activeSites: 0, pendingApplications: 0, activeContracts: 0 });
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#0669F7" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadStats(); }}
          colors={['#0669F7']}
        />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroDecor} />
        <Text style={styles.heroTitle}>{t('manager.tab_home')}</Text>
        <Text style={styles.heroSubtitle}>{t('manager.home_subtitle', '현장 및 채용 현황을 확인하세요')}</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(manager)/index' as any)} activeOpacity={0.8}>
          <Text style={styles.statIcon}>📋</Text>
          <Text style={styles.statValue}>{stats.openJobs}</Text>
          <Text style={styles.statLabel}>{t('manager.tab_jobs_label')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(manager)/sites' as any)} activeOpacity={0.8}>
          <Text style={styles.statIcon}>🏗️</Text>
          <Text style={styles.statValue}>{stats.activeSites}</Text>
          <Text style={styles.statLabel}>{t('manager.tab_sites_label')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(manager)/workers' as any)} activeOpacity={0.8}>
          <Text style={styles.statIcon}>👷</Text>
          <Text style={styles.statValue}>{stats.pendingApplications}</Text>
          <Text style={styles.statLabel}>{t('manager.tab_workers_label')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(manager)/contracts' as any)} activeOpacity={0.8}>
          <Text style={styles.statIcon}>📄</Text>
          <Text style={styles.statValue}>{stats.activeContracts}</Text>
          <Text style={styles.statLabel}>{t('manager.tab_contracts_label')}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('manager.home_quick_actions', '빠른 실행')}</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(manager)/jobs/create' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E8F0FF' }]}>
            <Text style={{ fontSize: 18 }}>➕</Text>
          </View>
          <Text style={styles.actionLabel}>{t('manager.screen_create_job')}</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(manager)/workers' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E8F9EE' }]}>
            <Text style={{ fontSize: 18 }}>👷</Text>
          </View>
          <Text style={styles.actionLabel}>{t('manager.tab_workers')}</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionRow, { borderBottomWidth: 0 }]}
          onPress={() => router.push('/(manager)/profile' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FFF3E8' }]}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </View>
          <Text style={styles.actionLabel}>{t('manager.profile_title')}</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hero: {
    backgroundColor: '#0669F7',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecor: {
    position: 'absolute', top: -40, right: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#EFF1F5',
  },
  statCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: '#F8F8FA',
    borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#EFF1F5',
  },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 26, fontWeight: '900', color: '#0669F7' },
  statLabel: { fontSize: 12, color: '#98A2B2', fontWeight: '600' },

  section: {
    backgroundColor: '#fff', marginTop: 12,
    paddingHorizontal: 16, paddingTop: 16,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#98A2B2', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F5',
  },
  actionIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#25282A' },
  actionArrow: { fontSize: 22, color: '#98A2B2', fontWeight: '300' },
});
