import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

interface Site {
  id: string;
  name: string;
  address: string;
  province: string;
  activeJobCount: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function ManagerSitesScreen() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSites = useCallback(async () => {
    try {
      const data = await api.get<Site[]>('/sites/mine');
      setSites(data);
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
            <Text style={styles.emptyText}>등록된 현장이 없습니다</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/(manager)/jobs/[id]', params: { id: item.id } })}
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
                  {item.status === 'ACTIVE' ? '운영 중' : '비활성'}
                </Text>
              </View>
            </View>
            {item.activeJobCount > 0 && (
              <View style={styles.jobCountRow}>
                <Text style={styles.jobCountText}>모집 중인 공고 {item.activeJobCount}개</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(manager)/register')}
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
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: Colors.onPrimary, fontSize: 28, lineHeight: 32 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
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
});
