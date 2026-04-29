import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Spacing, Font } from '../../constants/theme';
import { PERMISSIONS_DONE_KEY } from '../index';

export default function PermissionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState<Record<string, boolean>>({});

  const PERMISSIONS = [
    {
      id: 'location',
      icon: '📍',
      title: t('permissions.location_title'),
      description: t('permissions.location_desc'),
      required: false,
      request: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
      },
    },
    {
      id: 'camera',
      icon: '📷',
      title: t('permissions.camera_title'),
      description: t('permissions.camera_desc'),
      required: true,
      request: async () => {
        const camRes = await ImagePicker.requestCameraPermissionsAsync();
        const libRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return camRes.status === 'granted' || libRes.status === 'granted';
      },
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: t('permissions.notifications_title'),
      description: t('permissions.notifications_desc'),
      required: false,
      request: async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
      },
    },
  ];

  async function requestAll() {
    setLoading(true);
    const results: Record<string, boolean> = {};
    for (const perm of PERMISSIONS) {
      try {
        results[perm.id] = await perm.request();
      } catch {
        results[perm.id] = false;
      }
    }
    setGranted(results);
    await done();
  }

  async function done() {
    setLoading(false);
    await AsyncStorage.setItem(PERMISSIONS_DONE_KEY, '1').catch(() => {});
    router.replace('/(auth)/phone');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('permissions.nav_title') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.appName}>GADA VN</Text>
          <Text style={styles.title}>{t('permissions.title')}</Text>
          <Text style={styles.subtitle}>{t('permissions.subtitle1')}</Text>
          <Text style={styles.subtitle}>{t('permissions.subtitle2')}</Text>
        </View>

        <View style={styles.cards}>
          {PERMISSIONS.map((perm) => (
            <View key={perm.id} style={styles.card}>
              <Text style={styles.cardIcon}>{perm.icon}</Text>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{perm.title}</Text>
                  {perm.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>{t('permissions.required_badge')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardDesc}>{perm.description}</Text>
              </View>
              {granted[perm.id] !== undefined && (
                <Text style={[styles.grantedIcon, !granted[perm.id] && styles.deniedIcon]}>
                  {granted[perm.id] ? '✓' : '✕'}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.allowBtn, loading && styles.btnDisabled]}
          onPress={requestAll}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.allowBtnText}>
            {loading ? t('permissions.requesting') : t('permissions.allow_all')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={done}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>{t('permissions.skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.xxl, paddingBottom: Spacing.sm },

  header: { alignItems: 'center', marginBottom: Spacing.xxxl, paddingTop: 40 },
  appName: {
    ...Font.caption,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Font.h3,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Font.body3,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },

  cards: { gap: Spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.surfaceDim, borderRadius: Radius.lg, padding: 18,
  },
  cardIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { ...Font.t4, color: Colors.onSurface },
  requiredBadge: {
    backgroundColor: Colors.primaryContainer, borderRadius: Radius.xs,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  requiredText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  cardDesc: { ...Font.caption, color: Colors.onSurfaceVariant, lineHeight: 19 },
  grantedIcon: { fontSize: 18, fontWeight: '700', color: Colors.success, alignSelf: 'center' },
  deniedIcon: { color: Colors.error },

  buttons: { padding: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.sm },
  allowBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  allowBtnText: { color: Colors.onPrimary, ...Font.t3 },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { ...Font.body3, color: Colors.disabled },
});
