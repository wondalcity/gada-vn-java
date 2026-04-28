import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api-client';
import { Colors, Font, Radius, Spacing } from '../../../constants/theme';

interface ContractSummary {
  id: string;
  status: string;
  workerSignedAt: string | null;
  createdAt: string;
  jobTitle?: string;
  workDate?: string;
  dailyWage?: number;
  siteName?: string;
  managerName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING_WORKER_SIGN:   { label: '서명 필요',  bg: '#FFF8E6', text: '#92620A' },
  PENDING_MANAGER_SIGN:  { label: '관리자 서명 대기', bg: Colors.primaryContainer, text: Colors.primaryDark },
  FULLY_SIGNED:          { label: '계약 완료', bg: Colors.successContainer, text: Colors.onSuccessContainer },
  CANCELLED:             { label: '취소됨',   bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant },
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function formatVnd(n: number | undefined): string {
  if (n == null) return '-';
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫';
}

export default function WorkerContractsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<ContractSummary[]>('/contracts/mine');
      setContracts(Array.isArray(data) ? data : []);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={contracts}
      keyExtractor={(item) => item.id}
      style={s.container}
      contentContainerStyle={s.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          colors={[Colors.primary]}
        />
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📄</Text>
          <Text style={s.emptyTitle}>{t('contract.empty_title', '계약서가 없습니다')}</Text>
          <Text style={s.emptySubtitle}>{t('contract.empty_sub', '채용 확정 후 계약서가 발급됩니다')}</Text>
        </View>
      }
      renderItem={({ item }) => {
        const cfg = STATUS_CONFIG[item.status] ?? {
          label: item.status,
          bg: Colors.surfaceContainer,
          text: Colors.onSurfaceVariant,
        };
        const needsSign = item.status === 'PENDING_WORKER_SIGN';

        return (
          <TouchableOpacity
            style={[s.card, needsSign && s.cardHighlight]}
            onPress={() => router.push({ pathname: '/(worker)/contracts/[id]', params: { id: item.id } })}
            activeOpacity={0.8}
          >
            {/* Status badge */}
            <View style={s.cardTop}>
              <Text style={s.cardTitle} numberOfLines={2}>
                {item.jobTitle ?? t('common.untitled', '제목 없음')}
              </Text>
              <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                <Text style={[s.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
              </View>
            </View>

            {item.siteName ? (
              <Text style={s.siteName}>{item.siteName}</Text>
            ) : null}

            <View style={s.cardFooter}>
              <View style={s.metaRow}>
                <Text style={s.metaIcon}>📅</Text>
                <Text style={s.metaText}>{formatDate(item.workDate)}</Text>
              </View>
              {item.dailyWage ? (
                <Text style={s.wage}>{formatVnd(item.dailyWage)}</Text>
              ) : null}
            </View>

            {item.managerName ? (
              <Text style={s.managerName}>
                {t('contract.manager_label', '관리자')}: {item.managerName}
              </Text>
            ) : null}

            {needsSign && (
              <View style={s.signCta}>
                <Text style={s.signCtaText}>✍️ {t('contract.sign_button', '서명하기')}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.xs,
    shadowColor: Colors.shadowBlack,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardHighlight: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F9FF',
  },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, ...Font.t4, color: Colors.onSurface },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  badgeText: { ...Font.caption, fontWeight: '700' },

  siteName: { ...Font.body3, color: Colors.onSurfaceVariant, marginTop: 2 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 12 },
  metaText: { ...Font.caption, color: Colors.onSurfaceVariant },
  wage: { ...Font.t4, color: Colors.brand },

  managerName: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 2 },

  signCta: {
    marginTop: 8,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryContainer,
    alignItems: 'center',
  },
  signCtaText: { ...Font.body3, color: Colors.primary, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...Font.t4, color: Colors.onSurface },
  emptySubtitle: { ...Font.body3, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
