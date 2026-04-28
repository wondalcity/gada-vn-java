import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

interface WorkerHeaderProps {
  /** true for screens with dark (hero) background */
  dark?: boolean;
}

export default function WorkerHeader({ dark = false }: WorkerHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 4 }, dark && styles.headerDark]}>
      {/* GADA VN logo — matches web app header */}
      <View style={styles.logoWrap}>
        <Text style={[styles.logoSub, dark && styles.logoSubDark]}>가다</Text>
        <View style={styles.logoRow}>
          <Text style={[styles.logoMain, dark && styles.logoMainDark]}>GADA</Text>
          <Text style={[styles.logoVn, dark && styles.logoVnDark]}>vn</Text>
        </View>
      </View>

      {/* Action icons: phone · flag · search · bell */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn} hitSlop={8} activeOpacity={0.7} accessibilityLabel="고객센터">
          <Text style={styles.icon}>📞</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} hitSlop={8} activeOpacity={0.7} accessibilityLabel="언어 변경">
          <Text style={styles.icon}>🇻🇳</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push({ pathname: '/(worker)/', params: { openFilter: String(Date.now()) } } as any)}
          hitSlop={8}
          activeOpacity={0.7}
          accessibilityLabel="검색"
        >
          <Text style={styles.icon}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/(worker)/notifications' as any)}
          hitSlop={8}
          activeOpacity={0.7}
          accessibilityLabel="알림"
        >
          <Text style={styles.icon}>🔔</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  headerDark: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },

  // Logo
  logoWrap: { flexDirection: 'column', justifyContent: 'center' },
  logoSub: {
    fontSize: 9, color: Colors.primary, fontWeight: '700',
    letterSpacing: 1.5, lineHeight: 12,
  },
  logoSubDark: { color: 'rgba(255,255,255,0.7)' },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  logoMain: { fontSize: 18, fontWeight: '900', color: Colors.primary, lineHeight: 22 },
  logoMainDark: { color: '#fff' },
  logoVn: { fontSize: 13, fontWeight: '400', color: Colors.onSurfaceVariant, lineHeight: 18 },
  logoVnDark: { color: 'rgba(255,255,255,0.6)' },

  // Actions
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 6 },
  icon: { fontSize: 20 },
});
