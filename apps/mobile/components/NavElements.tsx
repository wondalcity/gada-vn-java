/**
 * Shared navigation UI elements used in both worker and manager layouts.
 * Centralising here avoids the same code existing in two _layout.tsx files.
 */
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../constants/theme';

/** GADA-style back button — circular surface container with platform arrow */
export function BackBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        }
      }}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
      activeOpacity={0.7}
      style={btn.backWrap}
    >
      <View style={btn.circle}>
        <Text style={btn.backIcon}>
          {Platform.OS === 'ios' ? '‹' : '←'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** GADA-style close button — circular surface container with × */
export function CloseBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        }
      }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
      activeOpacity={0.7}
      style={btn.closeWrap}
    >
      <View style={btn.circle}>
        <Text style={btn.closeIcon}>✕</Text>
      </View>
    </TouchableOpacity>
  );
}

const btn = StyleSheet.create({
  backWrap:  { paddingLeft: Spacing.sm, paddingRight: Spacing.xs },
  closeWrap: { paddingLeft: Spacing.xs, paddingRight: Spacing.sm },
  circle: {
    width: 34, height: 34, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  backIcon: {
    fontSize: Platform.OS === 'ios' ? 22 : 18,
    lineHeight: Platform.OS === 'ios' ? 26 : 22,
    color: Colors.onSurface,
    fontWeight: Platform.OS === 'ios' ? '300' : '400',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
  closeIcon: {
    fontSize: 14,
    lineHeight: 18,
    color: Colors.onSurface,
    fontWeight: '600',
  },
});

/** GADA VN brand logo — used as headerTitle in native Stack/Tab headers */
export function GadaLogo() {
  return (
    <View style={logo.wrap}>
      <Text style={logo.sub}>가다</Text>
      <View style={logo.row}>
        <Text style={logo.main}>GADA</Text>
        <Text style={logo.vn}>vn</Text>
      </View>
    </View>
  );
}

const logo = StyleSheet.create({
  wrap: { flexDirection: 'column', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  sub: { fontSize: 9, color: Colors.primary, fontWeight: '700', letterSpacing: 1.5, lineHeight: 12 },
  main: { fontSize: 18, fontWeight: '900', color: Colors.primary, lineHeight: 22 },
  vn: { fontSize: 13, fontWeight: '400', color: Colors.onSurfaceVariant, lineHeight: 18 },
});
