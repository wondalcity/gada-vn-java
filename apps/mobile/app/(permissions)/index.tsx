import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PERMISSIONS_DONE_KEY } from '../index';

interface PermItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  required: boolean;
  request: () => Promise<boolean>;
}

const PERMISSIONS: PermItem[] = [
  {
    id: 'location',
    icon: '📍',
    title: '위치',
    description: '주변 건설 현장 및 구인 공고를 찾기 위해 위치 정보가 필요합니다.',
    required: false,
    request: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    },
  },
  {
    id: 'camera',
    icon: '📷',
    title: '카메라 및 사진',
    description: '신분증 촬영 및 프로필 사진 업로드에 사용됩니다.',
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
    title: '알림',
    description: '채용 확정, 계약서 도착 등 중요 알림을 받습니다.',
    required: false,
    request: async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    },
  },
];

export default function PermissionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState<Record<string, boolean>>({});

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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>GADA VN</Text>
          <Text style={styles.title}>앱 사용을 위한{'\n'}권한 허용</Text>
          <Text style={styles.subtitle}>
            더 나은 서비스를 위해 아래 권한이 필요합니다.{'\n'}
            언제든지 설정에서 변경할 수 있습니다.
          </Text>
        </View>

        {/* Permission Cards */}
        <View style={styles.cards}>
          {PERMISSIONS.map((perm) => (
            <View key={perm.id} style={styles.card}>
              <Text style={styles.cardIcon}>{perm.icon}</Text>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{perm.title}</Text>
                  {perm.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>필수</Text>
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

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.allowBtn, loading && styles.btnDisabled]}
          onPress={requestAll}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.allowBtnText}>
            {loading ? '권한 요청 중...' : '모두 허용하기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={done}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>나중에 설정할게요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingBottom: 8 },

  header: { alignItems: 'center', marginBottom: 36, paddingTop: 40 },
  appName: { fontSize: 14, fontWeight: '700', color: '#FF6B2C', letterSpacing: 2, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#1A1A1A', textAlign: 'center', lineHeight: 36, marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },

  cards: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#F8F9FA', borderRadius: 16, padding: 18,
  },
  cardIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  requiredBadge: {
    backgroundColor: '#FFF0EB', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  requiredText: { fontSize: 10, fontWeight: '700', color: '#FF6B2C' },
  cardDesc: { fontSize: 13, color: '#666', lineHeight: 19 },
  grantedIcon: { fontSize: 18, fontWeight: '700', color: '#22C55E', alignSelf: 'center' },
  deniedIcon: { color: '#EF4444' },

  buttons: { padding: 24, paddingTop: 12, gap: 10 },
  allowBtn: {
    backgroundColor: '#FF6B2C', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  allowBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { fontSize: 14, color: '#999', fontWeight: '500' },
});
