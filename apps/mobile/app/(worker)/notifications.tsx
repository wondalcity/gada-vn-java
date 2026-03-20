import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { api } from '../../lib/api-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  APPLICATION_ACCEPTED: '✅',
  APPLICATION_REJECTED: '❌',
  CONTRACT_READY: '📄',
  CONTRACT_SIGNED: '✍️',
  ATTENDANCE_MARKED: '📋',
};

export default function WorkerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ data: Notification[]; unreadCount: number }>('/notifications');
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, read: true } : n),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // non-fatal
    }
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // non-fatal
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} colors={['#FF6B2C']} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            알림 {unreadCount > 0 && <Text style={styles.badge}>({unreadCount})</Text>}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markAll}>모두 읽음</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>알림이 없습니다</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.item, !item.read && styles.itemUnread]}
          onPress={() => !item.read && markRead(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
          <View style={styles.itemBody}>
            <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}>
              {item.title}
            </Text>
            <Text style={styles.itemText} numberOfLines={2}>{item.body}</Text>
            <Text style={styles.itemTime}>
              {new Date(item.created_at).toLocaleString('ko-KR', {
                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
          {!item.read && <View style={styles.dot} />}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  badge: { color: '#FF6B2C' },
  markAll: { fontSize: 13, color: '#FF6B2C', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#999', fontSize: 15 },
  item: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff',
    borderRadius: 14, padding: 14, alignItems: 'flex-start',
  },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: '#FF6B2C' },
  icon: { fontSize: 22, width: 28, textAlign: 'center' },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#444' },
  itemTitleUnread: { color: '#1A1A1A', fontWeight: '700' },
  itemText: { fontSize: 13, color: '#666', lineHeight: 18 },
  itemTime: { fontSize: 11, color: '#aaa' },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B2C',
    alignSelf: 'center',
  },
});
