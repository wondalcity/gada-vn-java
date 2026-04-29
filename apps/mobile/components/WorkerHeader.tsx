import { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

const SUPPORT_PHONE = '+84568240240';

interface WorkerHeaderProps {
  /** true for screens with dark (hero) background */
  dark?: boolean;
}

export default function WorkerHeader({ dark = false }: WorkerHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchActive, setSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const inputRef = useRef<TextInput>(null);

  function activateSearch() {
    setSearchActive(true);
    // give React one frame to mount the input before focusing
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function submitSearch() {
    const q = searchText.trim();
    setSearchActive(false);
    setSearchText('');
    if (q) {
      router.push({ pathname: '/(worker)/', params: { q } } as any);
    }
  }

  function cancelSearch() {
    setSearchActive(false);
    setSearchText('');
  }

  // ── Search mode ──────────────────────────────────────────────────────────────
  if (searchActive) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 4 }, styles.headerSearch]}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="공고명 또는 현장명 검색..."
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={cancelSearch} hitSlop={8} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Normal mode ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.header, { paddingTop: insets.top + 4 }, dark && styles.headerDark]}>
      {/* GADA VN logo */}
      <View style={styles.logoWrap}>
        <Text style={[styles.logoSub, dark && styles.logoSubDark]}>가다</Text>
        <View style={styles.logoRow}>
          <Text style={[styles.logoMain, dark && styles.logoMainDark]}>GADA</Text>
          <Text style={[styles.logoVn, dark && styles.logoVnDark]}>vn</Text>
        </View>
      </View>

      {/* Actions: phone · search · bell  (flag hidden per design) */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconBtn}
          hitSlop={8}
          activeOpacity={0.7}
          accessibilityLabel="고객센터 전화"
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
        >
          <Text style={styles.icon}>📞</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={activateSearch}
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
  headerSearch: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.outline,
    gap: 8,
  },

  // Logo
  logoWrap: { flexDirection: 'column', justifyContent: 'center' },
  logoSub: { fontSize: 9, color: Colors.primary, fontWeight: '700', letterSpacing: 1.5, lineHeight: 12 },
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

  // Search bar
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    gap: 6,
  },
  searchIcon: { fontSize: 15, opacity: 0.6 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.onSurface,
    padding: 0,
  },
  clearBtn: { fontSize: 13, color: Colors.onSurfaceVariant, paddingHorizontal: 2 },
  cancelBtn: { paddingVertical: 4, paddingLeft: 4 },
  cancelText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
