import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../../lib/api-client';

interface Benefits {
  meals: boolean;
  transport: boolean;
  accommodation: boolean;
  insurance: boolean;
}

export default function CreateJobScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [dailyWage, setDailyWage] = useState('');
  const [slotsTotal, setSlotsTotal] = useState('1');
  const [siteId, setSiteId] = useState('');
  const [benefits, setBenefits] = useState<Benefits>({
    meals: false, transport: false, accommodation: false, insurance: false,
  });
  const [loading, setLoading] = useState(false);

  const isValid = title.trim().length > 0 && workDate.length === 10 && Number(dailyWage) > 0;

  function toggleBenefit(key: keyof Benefits) {
    setBenefits((b) => ({ ...b, [key]: !b[key] }));
  }

  async function handleCreate() {
    if (!isValid) return;
    setLoading(true);
    try {
      await api.post('/jobs', {
        siteId: siteId.trim() || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        workDate,
        startTime,
        endTime,
        dailyWage: parseInt(dailyWage.replace(/,/g, ''), 10),
        slotsTotal: parseInt(slotsTotal, 10),
        benefits,
      });
      Alert.alert('등록 완료', '일자리가 등록되었습니다.', [
        { text: '확인', onPress: () => router.replace('/(manager)/') },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '등록에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>새 일자리 등록</Text>

      <Text style={styles.label}>제목 *</Text>
      <TextInput style={styles.input} placeholder="콘크리트 타설 작업" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>근무일 * (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input} placeholder="2026-04-01" value={workDate}
        onChangeText={setWorkDate} keyboardType="numbers-and-punctuation" maxLength={10}
      />

      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.label}>시작 시간</Text>
          <TextInput style={styles.input} placeholder="08:00" value={startTime} onChangeText={setStartTime} />
        </View>
        <View style={{ width: 12 }} />
        <View style={styles.flex}>
          <Text style={styles.label}>종료 시간</Text>
          <TextInput style={styles.input} placeholder="17:00" value={endTime} onChangeText={setEndTime} />
        </View>
      </View>

      <Text style={styles.label}>일당 (VND) *</Text>
      <TextInput
        style={styles.input} placeholder="500,000" value={dailyWage}
        onChangeText={setDailyWage} keyboardType="numeric"
      />

      <Text style={styles.label}>모집 인원 *</Text>
      <TextInput
        style={styles.input} placeholder="1" value={slotsTotal}
        onChangeText={setSlotsTotal} keyboardType="numeric"
      />

      <Text style={styles.label}>상세 내용 (선택)</Text>
      <TextInput
        style={[styles.input, styles.textarea]} placeholder="작업 상세 설명..."
        value={description} onChangeText={setDescription}
        multiline numberOfLines={4} textAlignVertical="top"
      />

      <Text style={styles.sectionTitle}>제공 혜택</Text>
      {([
        ['meals', '🍱 식사 제공'],
        ['transport', '🚌 교통 지원'],
        ['accommodation', '🏠 숙소 제공'],
        ['insurance', '🛡️ 보험 적용'],
      ] as [keyof Benefits, string][]).map(([key, label]) => (
        <View key={key} style={styles.switchRow}>
          <Text style={styles.switchLabel}>{label}</Text>
          <Switch
            value={benefits[key]}
            onValueChange={() => toggleBenefit(key)}
            trackColor={{ false: '#E0E0E0', true: '#FF6B2C' }}
            thumbColor="#fff"
          />
        </View>
      ))}

      <View style={{ height: 24 }} />
      <TouchableOpacity
        style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={!isValid || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>등록하기</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#1A1A1A',
  },
  textarea: { height: 96, paddingTop: 14 },
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginTop: 24, marginBottom: 12 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  switchLabel: { fontSize: 15, color: '#333' },
  button: {
    backgroundColor: '#FF6B2C', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
