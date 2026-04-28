import { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  GooglePlacesAutocomplete,
  type GooglePlacesAutocompleteRef,
} from 'react-native-google-places-autocomplete';
import { api } from '../../../lib/api-client';
import { Colors, Spacing, Radius, Font } from '../../../constants/theme';

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

const SITE_TYPES = ['아파트/주거', '도로/교량', '상업시설', '산업시설', '공공시설', '기타'];

/** Extract the province-level component from Google's address_components array */
function extractProvince(
  components: Array<{ long_name: string; types: string[] }>,
): string {
  // Vietnam: administrative_area_level_1 = tỉnh / thành phố
  const province = components.find((c) =>
    c.types.includes('administrative_area_level_1'),
  );
  return province?.long_name ?? '';
}

function extractDistrict(
  components: Array<{ long_name: string; types: string[] }>,
): string {
  const district = components.find(
    (c) =>
      c.types.includes('administrative_area_level_2') ||
      c.types.includes('locality'),
  );
  return district?.long_name ?? '';
}

export default function CreateSiteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const autocompleteRef = useRef<GooglePlacesAutocompleteRef>(null);

  const [name, setName] = useState('');
  const [nameVi, setNameVi] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [siteType, setSiteType] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert(t('common.error'), '현장명을 입력해주세요.');
      return;
    }
    if (!address.trim()) {
      Alert.alert(t('common.error'), '주소를 입력해주세요.');
      return;
    }
    if (!province.trim()) {
      Alert.alert(t('common.error'), '도시/성을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/manager/sites', {
        name: name.trim(),
        nameVi: nameVi.trim() || undefined,
        address: address.trim(),
        province: province.trim(),
        district: district.trim() || undefined,
        lat,
        lng,
        siteType: siteType || undefined,
      });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('common.process_fail'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 현장명 (한국어) */}
        <View style={styles.field}>
          <Text style={styles.label}>현장명 (한국어) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="예) 하노이 빈홈즈 스마트시티 A동"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* 현장명 (베트남어) */}
        <View style={styles.field}>
          <Text style={styles.label}>현장명 (베트남어) <Text style={styles.optional}>선택</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Tên công trường tiếng Việt"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={nameVi}
            onChangeText={setNameVi}
          />
        </View>

        {/* ── 주소 (Google Places Autocomplete) ───────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.label}>주소 <Text style={styles.required}>*</Text></Text>
          {PLACES_KEY ? (
            <View style={styles.autocompleteWrapper}>
              <GooglePlacesAutocomplete
                ref={autocompleteRef}
                placeholder="베트남 현장 주소 검색..."
                fetchDetails
                onPress={(data, details) => {
                  const formatted = details?.formatted_address ?? data.description;
                  setAddress(formatted);
                  if (details?.geometry?.location) {
                    setLat(details.geometry.location.lat);
                    setLng(details.geometry.location.lng);
                  }
                  if (details?.address_components) {
                    const prov = extractProvince(details.address_components);
                    const dist = extractDistrict(details.address_components);
                    if (prov && !province) setProvince(prov);
                    if (dist && !district) setDistrict(dist);
                  }
                }}
                query={{
                  key: PLACES_KEY,
                  language: 'vi',
                  components: 'country:vn',
                }}
                textInputProps={{
                  value: address,
                  onChangeText: (text) => {
                    setAddress(text);
                    if (!text) { setLat(undefined); setLng(undefined); }
                  },
                }}
                styles={{
                  textInput: styles.input,
                  listView: styles.autocompleteList,
                  row: styles.autocompleteRow,
                  description: { ...Font.body3, color: Colors.onSurface },
                  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.outline },
                  poweredContainer: { display: 'none' },
                }}
                enablePoweredByContainer={false}
                keepResultsAfterBlur
                listViewDisplayed="auto"
              />
              {lat != null && lng != null && (
                <View style={styles.coordBadge}>
                  <Text style={styles.coordText}>📍 {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
                </View>
              )}
            </View>
          ) : (
            /* Fallback: plain text if no Places API key configured */
            <TextInput
              style={styles.input}
              placeholder="예) 458 Minh Khai, Hà Nội"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={address}
              onChangeText={setAddress}
            />
          )}
        </View>

        {/* 도시/성 */}
        <View style={styles.field}>
          <Text style={styles.label}>도시/성 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="예) Hà Nội, Hồ Chí Minh"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={province}
            onChangeText={setProvince}
          />
        </View>

        {/* 구/군 */}
        <View style={styles.field}>
          <Text style={styles.label}>구/군 <Text style={styles.optional}>선택</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="예) Hai Bà Trưng"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={district}
            onChangeText={setDistrict}
          />
        </View>

        {/* 현장 유형 */}
        <View style={styles.field}>
          <Text style={styles.label}>현장 유형 <Text style={styles.optional}>선택</Text></Text>
          <View style={styles.typeGrid}>
            {SITE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, siteType === type && styles.typeChipActive]}
                onPress={() => setSiteType(siteType === type ? '' : type)}
              >
                <Text style={[styles.typeChipText, siteType === type && styles.typeChipTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color={Colors.onPrimary} />
            : <Text style={styles.submitBtnText}>현장 등록</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 40 },

  field: { gap: 6 },
  label: { ...Font.body3, color: Colors.onSurface, fontWeight: '600' },
  required: { color: Colors.error },
  optional: { ...Font.caption, color: Colors.onSurfaceVariant, fontWeight: '400' },

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    ...Font.body3,
    color: Colors.onSurface,
  },

  // ── Places Autocomplete ────────────────────────────────────────────────────
  autocompleteWrapper: { gap: 6 },
  autocompleteList: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.sm,
    marginTop: 2,
    zIndex: 10,
  },
  autocompleteRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
  },
  coordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  coordText: { ...Font.caption, color: Colors.primary, fontWeight: '600' },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.outline,
    backgroundColor: Colors.surface,
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  typeChipText: { ...Font.body3, color: Colors.onSurfaceVariant },
  typeChipTextActive: { color: Colors.primary, fontWeight: '600' },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { ...Font.t4, color: Colors.onPrimary, fontWeight: '700' },
});
