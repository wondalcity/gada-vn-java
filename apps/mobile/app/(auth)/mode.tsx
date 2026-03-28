import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Font } from '../../constants/theme';

export default function ModeSelectScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={styles.title}>어떤 모드로 시작할까요?</Text>
          <Text style={styles.subtitle}>두 역할을 모두 보유하고 있습니다</Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.option, styles.optionWorker]}
            onPress={() => router.replace('/(worker)')}
            activeOpacity={0.85}
          >
            <Text style={styles.optionIcon}>👷</Text>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>근로자 모드</Text>
              <Text style={styles.optionDesc}>일자리를 검색하고 지원합니다</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, styles.optionManager]}
            onPress={() => router.replace('/(manager)')}
            activeOpacity={0.85}
          >
            <Text style={styles.optionIcon}>🏗️</Text>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>관리자 모드</Text>
              <Text style={styles.optionDesc}>일자리를 등록하고 근로자를 고용합니다</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>프로필에서 언제든 모드를 전환할 수 있습니다</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.xxl, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoText: { fontSize: 28, fontWeight: '900', color: Colors.onPrimary },
  title: { ...Font.h3, color: Colors.onSurface, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { ...Font.body3, color: Colors.onSurfaceVariant, textAlign: 'center' },

  options: { gap: Spacing.md, marginBottom: Spacing.xxl },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  optionWorker: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  optionManager: {
    backgroundColor: Colors.secondaryContainer,
    borderColor: Colors.secondary,
  },
  optionIcon: { fontSize: 40, width: 52, textAlign: 'center' },
  optionBody: { flex: 1 },
  optionTitle: { ...Font.t3, color: Colors.onSurface, marginBottom: 4 },
  optionDesc: { ...Font.caption, color: Colors.onSurfaceVariant, lineHeight: 18 },
  arrow: { fontSize: 24, color: Colors.onSurfaceVariant },

  hint: { ...Font.caption, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
