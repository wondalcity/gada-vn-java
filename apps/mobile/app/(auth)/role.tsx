import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { api, ApiError } from '../../lib/api-client';

type Role = 'WORKER' | 'MANAGER';

interface RoleOption {
  role: Role;
  icon: string;
  titleKey: string;
  descKey: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'WORKER',
    icon: '👷',
    titleKey: 'auth.role_worker',
    descKey: 'auth.role_worker_desc',
  },
  {
    role: 'MANAGER',
    icon: '🏗️',
    titleKey: 'auth.role_manager',
    descKey: 'auth.role_manager_desc',
  },
];

export default function RoleSelectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userId, setUser } = useAuthStore();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!selected || !userId) return;
    setLoading(true);
    try {
      await api.post('/auth/register', { role: selected });
      setUser(userId, selected);
      if (selected === 'MANAGER') {
        router.replace('/(manager)/register');
      } else {
        router.replace('/(worker)/');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '역할 등록에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>어떤 역할로 시작하시겠습니까?</Text>
        <Text style={styles.subtitle}>나중에 프로필에서 변경할 수 없습니다</Text>

        <View style={styles.options}>
          {ROLE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.role}
              style={[styles.option, selected === opt.role && styles.optionSelected]}
              onPress={() => setSelected(opt.role)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionIcon}>{opt.icon}</Text>
              <View style={styles.optionBody}>
                <Text style={[styles.optionTitle, selected === opt.role && styles.optionTitleSelected]}>
                  {opt.role === 'WORKER' ? '근로자' : '현장 관리자'}
                </Text>
                <Text style={[styles.optionDesc, selected === opt.role && styles.optionDescSelected]}>
                  {opt.role === 'WORKER'
                    ? '건설 현장 일자리를 검색하고 지원합니다'
                    : '일자리를 등록하고 근로자를 고용합니다'}
                </Text>
              </View>
              <View style={[styles.radio, selected === opt.role && styles.radioSelected]}>
                {selected === opt.role && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selected === 'MANAGER' && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              📋 관리자 등록 후 관리자 검토가 필요합니다. 승인 후 일자리 등록이 가능합니다.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (!selected || loading) && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!selected || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>시작하기</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 40 },
  options: { gap: 16, marginBottom: 24 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 20,
    padding: 20, backgroundColor: '#FAFAFA',
  },
  optionSelected: { borderColor: '#FF6B2C', backgroundColor: '#FFF8F5' },
  optionIcon: { fontSize: 40, width: 52, textAlign: 'center' },
  optionBody: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 18, fontWeight: '700', color: '#444' },
  optionTitleSelected: { color: '#FF6B2C' },
  optionDesc: { fontSize: 13, color: '#888', lineHeight: 18 },
  optionDescSelected: { color: '#FF6B2C' },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#E0E0E0',
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: '#FF6B2C' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF6B2C' },
  notice: { backgroundColor: '#FFF8F5', borderRadius: 12, padding: 14, marginBottom: 24 },
  noticeText: { fontSize: 13, color: '#FF6B2C', lineHeight: 20 },
  button: {
    backgroundColor: '#FF6B2C', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#E0E0E0' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
