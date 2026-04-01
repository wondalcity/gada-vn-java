import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

type ContractStatus = 'PENDING' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';

interface Contract {
  id: string;
  jobTitle: string;
  siteName: string;
  workerName: string;
  workDate: string;
  status: ContractStatus;
  dailyWage: number;
}

// STATUS_CONFIG built inside component to use t()


function formatDate(d: string) {
  const date = new Date(d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
}

function formatWage(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫';
}

// TAB_FILTERS built inside component to use t()


export default function ManagerContractsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);

  const STATUS_CONFIG: Record<ContractStatus, { label: string; bg: string; text: string }> = {
    PENDING:   { label: t('contract.status_pending'),   bg: Colors.primaryContainer,  text: Colors.primary },
    SIGNED:    { label: t('contract.status_signed'),    bg: Colors.successContainer,  text: Colors.onSuccessContainer },
    COMPLETED: { label: t('contract.status_completed'), bg: Colors.surfaceContainer,   text: Colors.onSurfaceVariant },
    CANCELLED: { label: t('contract.status_cancelled'), bg: Colors.errorContainer,     text: Colors.onErrorContainer },
  };

  const TAB_FILTERS: { key: ContractStatus | 'ALL'; label: string }[] = [
    { key: 'ALL',       label: t('contract.filter_all') },
    { key: 'PENDING',   label: t('contract.filter_pending') },
    { key: 'SIGNED',    label: t('contract.filter_signed') },
    { key: 'COMPLETED', label: t('contract.filter_completed') },
  ];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ContractStatus | 'ALL'>('ALL');

  const loadContracts = useCallback(async () => {
    try {
      const data = await api.get<Contract[]>('/contracts/mine-as-manager');
      setContracts(data);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const filtered = activeFilter === 'ALL'
    ? contracts
    : contracts.filter(c => c.status === activeFilter);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        {TAB_FILTERS.map(({ key, label }) => {
          const count = key === 'ALL' ? contracts.length : contracts.filter(c => c.status === key).length;
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadContracts(); }}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>{t('contract.no_contracts')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/(manager)/contracts/[id]', params: { id: item.id } })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.avatarText}>{item.workerName.charAt(0)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.workerName}>{item.workerName}</Text>
                  <Text style={styles.jobTitle} numberOfLines={1}>{item.jobTitle}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>📍 {item.siteName}</Text>
                <Text style={styles.metaText}>📅 {formatDate(item.workDate)}</Text>
                <Text style={styles.wagText}>{formatWage(item.dailyWage)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  workerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Font.t4, color: Colors.primary },
  cardInfo: { flex: 1 },
  workerName: { ...Font.t4, color: Colors.onSurface },
  jobTitle: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { ...Font.caption, fontWeight: '700' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'center' },
  metaText: { ...Font.caption, color: Colors.onSurfaceVariant },
  wagText: { ...Font.caption, color: Colors.primary, fontWeight: '700', marginLeft: 'auto' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Font.body3, color: Colors.onSurfaceVariant },
});
