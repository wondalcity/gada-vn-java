import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

interface Site {
  id: string;
  name: string;
  address: string;
  province: string;
  jobCount: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const DEMO_SITES: Site[] = [
  { id: 'demo-1', name: '하노이 스타레이크 시티 A동 신축', address: '28 Xuân La, Tây Hồ, Hà Nội', province: 'Hà Nội', jobCount: 3, status: 'ACTIVE' },
  { id: 'demo-2', name: '호치민 빈홈즈 그랜드파크 상업동', address: '188 Nguyễn Xiển, Long Bình, Quận 9, Hồ Chí Minh', province: 'Hồ Chí Minh', jobCount: 2, status: 'ACTIVE' },
  { id: 'demo-3', name: '다낭 선월드 케이블카 지지대 기초', address: 'Bãi Bụt, Sơn Trà, Đà Nẵng', province: 'Đà Nẵng', jobCount: 2, status: 'ACTIVE' },
  { id: 'demo-4', name: '하이퐁 LG 전자 3공장 증설', address: 'Khu công nghiệp Tràng Duệ, An Dương, Hải Phòng', province: 'Hải Phòng', jobCount: 0, status: 'INACTIVE' },
  { id: 'demo-5', name: '호치민 메트로 2호선 역사 마감', address: '149 Phạm Ngũ Lão, Quận 1, Hồ Chí Minh', province: 'Hồ Chí Minh', jobCount: 1, status: 'INACTIVE' },
];

export default function ManagerSitesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSites = useCallback(async () => {
    try {
      const data = await api.get<Site[]>('/manager/sites');
      setSites(Array.isArray(data) ? data : []);
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sites}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadSites(); }}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyText}>{t('manager.site_no_sites')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(item.name, '이 현장에서 무엇을 하시겠습니까?', [
                { text: t('common.cancel'), style: 'cancel' },
                { text: '공고 등록', onPress: () => router.push({ pathname: '/(manager)/jobs/create', params: { siteId: item.id } }) },
              ]);
            }}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>🏗️</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.siteName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.address} numberOfLines={1}>{item.province} · {item.address}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'ACTIVE' ? Colors.successContainer : Colors.surfaceContainer },
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: item.status === 'ACTIVE' ? Colors.onSuccessContainer : Colors.onSurfaceVariant },
                ]}>
                  {item.status === 'ACTIVE' ? t('manager.site_status_active') : t('manager.site_status_inactive')}
                </Text>
              </View>
            </View>
            {item.jobCount > 0 && (
              <View style={styles.jobCountRow}>
                <Text style={styles.jobCountText}>{t('manager.site_job_count', { count: item.jobCount })}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* FAB — create new site */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(manager)/sites/create')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 80 },

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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBox: {
    width: 44, height: 44, borderRadius: Radius.sm,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  info: { flex: 1 },
  siteName: { ...Font.t4, color: Colors.onSurface },
  address: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { ...Font.caption, fontWeight: '700' },

  jobCountRow: {
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.outline,
  },
  jobCountText: { ...Font.caption, color: Colors.primary, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: Colors.onPrimary, fontSize: 28, lineHeight: 32 },
});
