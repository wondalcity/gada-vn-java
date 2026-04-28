import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface WorkerHeaderProps {
  /** true for screens with dark (hero) background */
  dark?: boolean;
}

export default function WorkerHeader({ dark = false }: WorkerHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 4 }, dark && styles.headerDark]}>
      <Text style={[styles.logo, dark && styles.logoDark]}>GADA VN</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.iconBtn, dark && styles.iconBtnDark]}
          onPress={() => router.push({ pathname: '/(worker)/', params: { openFilter: String(Date.now()) } } as any)}
          hitSlop={8}
          activeOpacity={0.7}
          accessibilityLabel="일자리 검색"
        >
          <Text style={styles.icon}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, dark && styles.iconBtnDark]}
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
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  headerDark: {
    backgroundColor: 'transparent',
  },
  logo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0669F7',
    letterSpacing: -0.5,
  },
  logoDark: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
  },
  iconBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  icon: {
    fontSize: 18,
  },
});
