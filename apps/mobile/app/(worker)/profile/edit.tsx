import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal, FlatList,
  Alert,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from '../../../lib/i18n';
import { api, ApiError } from '../../../lib/api-client';
import { useAuthStore } from '../../../store/auth.store';
import { showToast } from '../../../lib/toast';
import DatePickerField from '../../../components/DatePickerField';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkerProfile {
  full_name: string | null;
  date_of_birth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  bio: string | null;
  primary_trade_id: number | null;
  trade_name_ko: string | null;
  experience_months: number;
  current_province: string | null;
  current_district: string | null;
  id_number: string | null;
  id_verified: boolean;
  id_front_url: string | null;
  id_back_url: string | null;
  signature_url: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_book_url: string | null;
  profile_image_url: string | null;
  phone: string | null;
  email: string | null;
}

interface TradeSkill {
  trade_id: number;
  years: number;
  name_ko?: string;
  name_vi?: string;
}

interface Trade {
  id: number;
  nameKo?: string;
  nameVi?: string;
}

interface SavedLocation {
  id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  is_default: boolean;
}

type TabId = 'basic' | 'skills' | 'address' | 'bank' | 'id' | 'signature';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const p = phone.trim();
  if (p.startsWith('+84')) {
    const d = p.slice(3);
    if (d.length === 9) return `+84 ${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  }
  if (p.startsWith('+82')) {
    const d = p.slice(3);
    if (d.length >= 9) return `+82 ${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(d.length - 4)}`;
  }
  return p;
}

async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    showToast({ message: i18n.t('common.photo_permission', '사진 접근 권한이 필요합니다'), type: 'error' });
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return asset.base64 ? `data:${asset.mimeType};base64,${asset.base64}` : null;
}

async function uploadImageToApi(dataUrl: string, folder: string): Promise<string | null> {
  try {
    const res = await api.post<{ key: string }>('/files/upload-base64', { dataUrl, folder });
    return res.key;
  } catch {
    return dataUrl;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string; subtitle: string }[] = [
  { id: 'basic',     label: '기본 정보', icon: '👤', subtitle: '기본 정보를 입력해주세요' },
  { id: 'skills',    label: '직종/경력', icon: '🔧', subtitle: '직종과 경력을 입력하면 더 나은 일자리를 추천받을 수 있어요' },
  { id: 'address',   label: '주소',     icon: '📍', subtitle: '현재 거주 주소를 설정하세요' },
  { id: 'bank',      label: '계좌',     icon: '🏦', subtitle: '급여를 받을 계좌 정보를 등록하세요' },
  { id: 'id',        label: '신분증',   icon: '🪪', subtitle: '신분증을 등록하면 플랫폼 신뢰도가 올라가요' },
  { id: 'signature', label: '서명',     icon: '✍️', subtitle: '전자 서명을 등록하면 계약서에 사용됩니다' },
];

const VN_BANKS = [
  { code: 'VCB',    name: 'Vietcombank',  fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { code: 'CTG',    name: 'VietinBank',   fullName: 'Ngân hàng TMCP Công thương Việt Nam' },
  { code: 'BIDV',   name: 'BIDV',         fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: 'AGR',    name: 'Agribank',     fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn' },
  { code: 'MBB',    name: 'MB Bank',      fullName: 'Ngân hàng TMCP Quân đội' },
  { code: 'TCB',    name: 'Techcombank',  fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { code: 'ACB',    name: 'ACB',          fullName: 'Ngân hàng TMCP Á Châu' },
  { code: 'VPB',    name: 'VPBank',       fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: 'TPB',    name: 'TPBank',       fullName: 'Ngân hàng TMCP Tiên Phong' },
  { code: 'STB',    name: 'Sacombank',    fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: 'WOO',    name: 'Woori Bank',   fullName: 'Ngân hàng Woori Việt Nam' },
  { code: 'SHINHAN',name: 'Shinhan Bank', fullName: 'Ngân hàng Shinhan Việt Nam' },
];

const VN_PROVINCES = [
  'Hà Nội', 'Hồ Chí Minh', 'Bình Dương', 'Đồng Nai', 'Đà Nẵng',
  'Hải Phòng', 'Cần Thơ', 'Bà Rịa - Vũng Tàu', 'Long An', 'Khánh Hòa',
  'Bình Định', 'Nghệ An', 'Thanh Hóa', 'Thừa Thiên Huế', 'Quảng Nam',
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.fieldLabel}>{label}</Text>;
}

function SaveBtn({ saving, onPress, label }: { saving: boolean; onPress: () => void; label?: string }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={[s.saveBtn, saving && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={saving}
      activeOpacity={0.8}
    >
      {saving
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={s.saveBtnText}>{label ?? t('common.save', '저장')}</Text>}
    </TouchableOpacity>
  );
}

// ── CompletionBar ─────────────────────────────────────────────────────────────

function CompletionBar({
  profile,
  tradeSkills,
  savedLocations,
}: {
  profile: WorkerProfile;
  tradeSkills: TradeSkill[];
  savedLocations: SavedLocation[];
}) {
  const { t } = useTranslation();
  const checks = [
    !!profile.full_name,
    !!profile.date_of_birth,
    !!profile.gender,
    tradeSkills.length > 0,
    savedLocations.length > 0,
    !!(profile.bank_name && profile.bank_account_number),
    !!(profile.id_front_url && profile.id_back_url),
    !!profile.signature_url,
  ];
  const done = checks.filter(Boolean).length;
  const total = checks.length;
  const pct = Math.round((done / total) * 100);

  return (
    <View style={s.completionCard}>
      <View style={s.completionRow}>
        <Text style={s.completionLabel}>{t('worker.profile_completion', '프로필 완성도')}</Text>
        <Text style={s.completionPct}>{pct}%</Text>
      </View>
      <View style={s.completionTrack}>
        <View style={[s.completionFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={s.completionSub}>
        {t('worker.completion_items', { done, total, defaultValue: `${done}/${total} items complete` })}
      </Text>
    </View>
  );
}

// ── BasicSection ──────────────────────────────────────────────────────────────

function BasicSection({
  profile,
  onSaved,
}: {
  profile: WorkerProfile;
  onSaved: (p: Partial<WorkerProfile>) => void;
}) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [dob, setDob] = useState(profile.date_of_birth?.split('T')[0] ?? '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>(profile.gender ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.profile_image_url);
  const [saving, setSaving] = useState(false);

  async function handlePickAvatar() {
    const dataUrl = await pickImage();
    if (!dataUrl) return;
    setSaving(true);
    try {
      const key = await uploadImageToApi(dataUrl, 'worker-profile-pictures');
      if (key) {
        await api.put('/workers/me', { profilePictureS3Key: key });
        setAvatarUrl(dataUrl);
        onSaved({ profile_image_url: dataUrl });
        showToast({ message: t('worker.avatar_upload_success', '프로필 사진이 업로드되었습니다'), type: 'success' });
      }
    } catch {
      showToast({ message: t('worker.avatar_upload_fail', '프로필 사진 업로드에 실패했습니다'), type: 'error' });
    } finally { setSaving(false); }
  }

  async function handleDeleteAvatar() {
    Alert.alert(
      t('worker.avatar_delete_title', '사진 삭제'),
      t('worker.avatar_delete_confirm', '프로필 사진을 삭제하시겠습니까?'),
      [
        { text: t('common.cancel', '취소'), style: 'cancel' },
        {
          text: t('common.delete', '삭제'), style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await api.put('/workers/me', { profilePictureS3Key: null });
              setAvatarUrl(null);
              onSaved({ profile_image_url: null });
            } catch {
              showToast({ message: t('common.save_fail', '저장에 실패했습니다'), type: 'error' });
            } finally { setSaving(false); }
          },
        },
      ]
    );
  }

  async function handleSave() {
    if (!fullName.trim()) {
      showToast({ message: t('worker.name_required', '이름을 입력해주세요'), type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await api.put('/workers/me', {
        fullName: fullName.trim(),
        dateOfBirth: dob || null,
        gender: gender || null,
        bio: bio.trim() || null,
      });
      if (email.trim() && email !== profile.email) {
        await api.patch('/auth/me', { email: email.trim() }).catch(() => {});
      }
      onSaved({
        full_name: fullName.trim(),
        date_of_birth: dob || null,
        gender: (gender || null) as 'MALE' | 'FEMALE' | 'OTHER' | null,
        bio: bio.trim() || null,
        email: email.trim() || profile.email,
      });
      showToast({ message: t('worker.basic_save_success', '기본정보가 저장되었습니다'), type: 'success' });
    } catch (e) {
      showToast({ message: e instanceof ApiError ? e.message : t('common.save_fail', '저장에 실패했습니다'), type: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <View style={s.sectionBody}>
      {/* Profile photo */}
      <View style={s.photoSection}>
        <View style={s.avatarCircle}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
            : <Text style={s.avatarPlaceholderIcon}>👤</Text>}
        </View>
        <View style={s.photoActions}>
          <TouchableOpacity style={s.photoChangBtn} onPress={handlePickAvatar} disabled={saving} activeOpacity={0.8}>
            <Text style={s.photoChangeBtnText}>{t('worker.avatar_change', '사진 변경')}</Text>
          </TouchableOpacity>
          {avatarUrl && (
            <TouchableOpacity style={s.photoDeleteBtn} onPress={handleDeleteAvatar} disabled={saving} activeOpacity={0.8}>
              <Text style={s.photoDeleteBtnText}>{t('worker.avatar_delete', '사진 삭제')}</Text>
            </TouchableOpacity>
          )}
          <Text style={s.photoHint}>JPG, PNG, WebP (max 10MB)</Text>
        </View>
      </View>

      <FieldLabel label={t('worker.field_name', '이름') + ' *'} />
      <TextInput
        style={s.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('worker.field_name_placeholder', '이름을 입력하세요')}
        placeholderTextColor="#C0C4CF"
      />

      <FieldLabel label={t('worker.field_dob', '생년월일') + ' *'} />
      <DatePickerField value={dob || null} onChange={(v) => setDob(v)} placeholder="생년월일 선택" />

      <FieldLabel label={t('worker.field_gender', '성별') + ' *'} />
      <View style={s.genderRow}>
        {(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (
          <TouchableOpacity
            key={g}
            style={[s.genderBtn, gender === g && s.genderBtnActive]}
            onPress={() => setGender(g === gender ? '' : g)}
            activeOpacity={0.7}
          >
            <Text style={[s.genderText, gender === g && s.genderTextActive]}>
              {g === 'MALE' ? t('worker.gender_male', '남성') : g === 'FEMALE' ? t('worker.gender_female', '여성') : t('worker.gender_other', '기타')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FieldLabel label={t('worker.field_bio', '자기소개')} />
      <TextInput
        style={[s.input, { height: 80, textAlignVertical: 'top' }]}
        value={bio}
        onChangeText={setBio}
        placeholder={t('worker.field_bio_placeholder', '간단한 자기소개를 작성해주세요')}
        placeholderTextColor="#C0C4CF"
        multiline
        maxLength={500}
      />
      <Text style={s.charCount}>{bio.length}/500</Text>

      {/* Phone (read-only with Change button) */}
      <FieldLabel label={t('worker.field_phone', '전화번호')} />
      <View style={s.phoneRow}>
        <Text style={s.phoneValue}>{formatPhone(profile.phone)}</Text>
        <TouchableOpacity
          style={s.changeBtn}
          onPress={() => showToast({ message: t('worker.phone_change_info', '전화번호 변경은 설정 화면에서 가능합니다'), type: 'info' })}
          activeOpacity={0.7}
        >
          <Text style={s.changeBtnText}>{t('common.change', '변경')}</Text>
        </TouchableOpacity>
      </View>

      <FieldLabel label={t('worker.field_email', '이메일')} />
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        placeholder="example@email.com"
        placeholderTextColor="#C0C4CF"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <SaveBtn saving={saving} onPress={handleSave} />
    </View>
  );
}

// ── SkillsSection ─────────────────────────────────────────────────────────────

function SkillsSection({
  onSkillsChange,
}: {
  onSkillsChange: (skills: TradeSkill[]) => void;
}) {
  const { i18n: i18nInstance } = useTranslation();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [skills, setSkills] = useState<TradeSkill[]>([]);
  const [searchText, setSearchText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const locale = i18nInstance.language === 'vi' ? 'vi' : 'ko';
    Promise.all([
      api.get<Trade[]>(`/public/trades?locale=${locale}`).catch(() => [] as Trade[]),
      api.get<TradeSkill[]>('/workers/me/trade-skills').catch(() => [] as TradeSkill[]),
    ]).then(([trades, existing]) => {
      setAllTrades(Array.isArray(trades) ? trades : []);
      setSkills(Array.isArray(existing) ? existing : []);
    }).finally(() => setLoading(false));
  }, [i18nInstance.language]);

  function getTradeName(trade: Trade) {
    return i18nInstance.language === 'vi'
      ? (trade.nameVi || trade.nameKo || '')
      : (trade.nameKo || trade.nameVi || '');
  }

  function getSkillName(skill: TradeSkill) {
    if (skill.name_ko || skill.name_vi) {
      return i18nInstance.language === 'vi' ? (skill.name_vi || skill.name_ko || '') : (skill.name_ko || skill.name_vi || '');
    }
    const trade = allTrades.find(t => t.id === skill.trade_id);
    return trade ? getTradeName(trade) : String(skill.trade_id);
  }

  function toggleTrade(trade: Trade) {
    const existing = skills.find(s => s.trade_id === trade.id);
    if (existing) {
      setSkills(prev => prev.filter(s => s.trade_id !== trade.id));
    } else {
      setSkills(prev => [...prev, { trade_id: trade.id, years: 1, name_ko: trade.nameKo, name_vi: trade.nameVi }]);
    }
  }

  function updateYears(tradeId: number, years: number) {
    setSkills(prev => prev.map(s => s.trade_id === tradeId ? { ...s, years } : s));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/workers/me/trade-skills', {
        skills: skills.map(s => ({ tradeId: s.trade_id, years: s.years })),
      });
      onSkillsChange(skills);
      showToast({ message: '직종/경력이 저장되었습니다', type: 'success' });
    } catch {
      showToast({ message: '저장에 실패했습니다', type: 'error' });
    } finally { setSaving(false); }
  }

  const filteredTrades = searchText.trim()
    ? allTrades.filter(t => getTradeName(t).toLowerCase().includes(searchText.toLowerCase()))
    : allTrades;

  if (loading) {
    return <View style={s.sectionBody}><ActivityIndicator color="#0669F7" style={{ marginTop: 20 }} /></View>;
  }

  return (
    <View style={s.sectionBody}>
      {/* Selected skills */}
      {skills.length > 0 && (
        <View style={s.selectedSkillsWrap}>
          <Text style={s.fieldLabel}>{`선택된 직종 (${skills.length})`}</Text>
          {skills.map(skill => (
            <View key={skill.trade_id} style={s.skillRow}>
              <Text style={s.skillName} numberOfLines={1}>{getSkillName(skill)}</Text>
              <View style={s.skillYearsRow}>
                <TextInput
                  style={s.skillYearsInput}
                  value={String(skill.years)}
                  onChangeText={v => updateYears(skill.trade_id, parseInt(v, 10) || 0)}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={s.skillYearsLabel}>년</Text>
              </View>
              <TouchableOpacity
                style={s.skillRemoveBtn}
                onPress={() => setSkills(prev => prev.filter(s => s.trade_id !== skill.trade_id))}
                hitSlop={8}
              >
                <Text style={s.skillRemoveIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Search */}
      <FieldLabel label="직종 검색 (복수 선택)" />
      <TextInput
        style={s.input}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="직종 검색 (예: 콘크리트, 용접...)"
        placeholderTextColor="#C0C4CF"
        autoCorrect={false}
      />

      {/* Trade list */}
      <View style={s.tradeListWrap}>
        {filteredTrades.map(trade => {
          const isSelected = skills.some(s => s.trade_id === trade.id);
          return (
            <TouchableOpacity
              key={trade.id}
              style={[s.tradeListItem, isSelected && s.tradeListItemActive]}
              onPress={() => toggleTrade(trade)}
              activeOpacity={0.7}
            >
              <Text style={[s.tradeListItemText, isSelected && s.tradeListItemTextActive]}>
                {getTradeName(trade)}
              </Text>
              {isSelected && <Text style={s.tradeCheckmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.skillsHint}>직종을 선택하고 각 직종별 경력 연수를 입력하세요.</Text>

      <SaveBtn saving={saving} onPress={handleSave} />
    </View>
  );
}

// ── AddressSection ────────────────────────────────────────────────────────────

function AddressSection({
  onLocationsChange,
}: {
  onLocationsChange: (locations: SavedLocation[]) => void;
}) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newDistrict, setNewDistrict] = useState('');

  useEffect(() => {
    api.get<SavedLocation[]>('/workers/saved-locations')
      .then(res => setLocations(Array.isArray(res) ? res : []))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newProvince) {
      showToast({ message: '성/시를 선택해주세요', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const address = newDistrict ? `${newDistrict}, ${newProvince}` : newProvince;
      const label = newLabel.trim() || newProvince;
      const res = await api.post<SavedLocation>('/workers/saved-locations', {
        label,
        address,
        isDefault: locations.length === 0,
      });
      const updated = [...locations, res];
      setLocations(updated);
      onLocationsChange(updated);
      setShowAddForm(false);
      setNewLabel('');
      setNewProvince('');
      setNewDistrict('');
      showToast({ message: '주소가 저장되었습니다', type: 'success' });
    } catch {
      showToast({ message: '주소 저장에 실패했습니다', type: 'error' });
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/workers/saved-locations/${id}`);
      const updated = locations.filter(l => l.id !== id);
      setLocations(updated);
      onLocationsChange(updated);
      showToast({ message: '주소가 삭제되었습니다', type: 'success' });
    } catch {
      showToast({ message: '삭제에 실패했습니다', type: 'error' });
    }
  }

  if (loading) {
    return <View style={s.sectionBody}><ActivityIndicator color="#0669F7" style={{ marginTop: 20 }} /></View>;
  }

  return (
    <View style={s.sectionBody}>
      {locations.length === 0 && !showAddForm ? (
        <View style={s.emptyAddress}>
          <Text style={s.emptyAddressIcon}>📍</Text>
          <Text style={s.emptyAddressText}>저장된 주소가 없습니다.</Text>
        </View>
      ) : (
        <View style={s.locationList}>
          {locations.map(loc => (
            <View key={loc.id} style={s.locationCard}>
              <View style={s.locationInfo}>
                {loc.is_default && (
                  <View style={s.defaultBadge}><Text style={s.defaultBadgeText}>기본</Text></View>
                )}
                <Text style={s.locationLabel}>{loc.label}</Text>
                <Text style={s.locationAddress} numberOfLines={2}>{loc.address}</Text>
              </View>
              <TouchableOpacity
                style={s.locationDeleteBtn}
                onPress={() => handleDelete(loc.id)}
                hitSlop={8}
              >
                <Text style={s.locationDeleteText}>삭제</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add address form */}
      {showAddForm && (
        <View style={s.addAddressForm}>
          <FieldLabel label="레이블 (선택)" />
          <TextInput
            style={s.input}
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="예) 집, 회사"
            placeholderTextColor="#C0C4CF"
          />

          <FieldLabel label="성/시 (Province) *" />
          <View style={s.chipRow}>
            {VN_PROVINCES.map(prov => {
              const isActive = newProvince === prov;
              return (
                <TouchableOpacity
                  key={prov}
                  style={[s.chip, isActive && s.chipActive]}
                  onPress={() => setNewProvince(isActive ? '' : prov)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, isActive && s.chipTextActive]}>{prov}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FieldLabel label="구/군 (선택)" />
          <TextInput
            style={s.input}
            value={newDistrict}
            onChangeText={setNewDistrict}
            placeholder="예) Hai Bà Trưng"
            placeholderTextColor="#C0C4CF"
          />

          <View style={s.formBtnRow}>
            <TouchableOpacity
              style={s.cancelFormBtn}
              onPress={() => { setShowAddForm(false); setNewProvince(''); setNewDistrict(''); setNewLabel(''); }}
              activeOpacity={0.7}
            >
              <Text style={s.cancelFormBtnText}>취소</Text>
            </TouchableOpacity>
            <SaveBtn saving={saving} onPress={handleAdd} label="저장" />
          </View>
        </View>
      )}

      {!showAddForm && locations.length < 3 && (
        <TouchableOpacity
          style={s.addAddressBtn}
          onPress={() => setShowAddForm(true)}
          activeOpacity={0.7}
        >
          <Text style={s.addAddressBtnText}>+ 주소 추가</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── BankSection ───────────────────────────────────────────────────────────────

function BankSection({
  profile,
  onSaved,
}: {
  profile: WorkerProfile;
  onSaved: (p: Partial<WorkerProfile>) => void;
}) {
  const { t } = useTranslation();
  const [bankName, setBankName] = useState(profile.bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(profile.bank_account_number ?? '');
  const [bookUrl, setBookUrl] = useState<string | null>(profile.bank_book_url);
  const [saving, setSaving] = useState(false);
  const [bankSheetVisible, setBankSheetVisible] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  async function handlePickBook() {
    const dataUrl = await pickImage();
    if (!dataUrl) return;
    setSaving(true);
    try {
      const key = await uploadImageToApi(dataUrl, 'worker-bank-books');
      if (key) {
        await api.put('/workers/me', { bankBookS3Key: key });
        setBookUrl(dataUrl);
        onSaved({ bank_book_url: dataUrl });
      }
    } catch {
      showToast({ message: t('worker.bank_book_upload_fail', '통장 사본 업로드에 실패했습니다'), type: 'error' });
    } finally { setSaving(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/workers/me', {
        bankName: bankName.trim() || null,
        bankAccountNumber: accountNumber.trim() || null,
      });
      onSaved({ bank_name: bankName.trim() || null, bank_account_number: accountNumber.trim() || null });
      showToast({ message: t('worker.bank_save_success', '계좌 정보가 저장되었습니다'), type: 'success' });
    } catch (e) {
      showToast({ message: e instanceof ApiError ? e.message : t('common.save_fail', '저장에 실패했습니다'), type: 'error' });
    } finally { setSaving(false); }
  }

  const filteredBanks = bankSearch.trim()
    ? VN_BANKS.filter(b =>
        b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
        b.fullName.toLowerCase().includes(bankSearch.toLowerCase()) ||
        b.code.toLowerCase().includes(bankSearch.toLowerCase())
      )
    : VN_BANKS;

  return (
    <View style={s.sectionBody}>
      <FieldLabel label={t('worker.field_bank_name', '은행명')} />
      <TouchableOpacity
        style={[s.input, s.bankSelectBtn]}
        onPress={() => { setBankSearch(''); setBankSheetVisible(true); }}
        activeOpacity={0.7}
      >
        <Text style={bankName ? s.bankSelectText : s.bankSelectPlaceholder}>
          {bankName || t('worker.field_bank_select', '은행을 선택해주세요')}
        </Text>
        <Text style={s.bankSelectChevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={bankSheetVisible} transparent animationType="slide" onRequestClose={() => setBankSheetVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setBankSheetVisible(false)}>
          <View style={s.bankSheet} onStartShouldSetResponder={() => true}>
            <View style={s.bankSheetHandle} />
            <Text style={s.modalTitle}>은행 선택</Text>
            <TextInput
              style={s.bankSearchInput}
              value={bankSearch}
              onChangeText={setBankSearch}
              placeholder="은행 검색..."
              placeholderTextColor="#C0C4CF"
              autoCorrect={false}
            />
            <FlatList
              data={filteredBanks}
              keyExtractor={b => b.code}
              style={s.bankList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = bankName === item.name;
                return (
                  <TouchableOpacity
                    style={[s.bankItem, selected && s.bankItemActive]}
                    onPress={() => { setBankName(item.name); setBankSheetVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.bankItemName, selected && s.bankItemNameActive]}>{item.name}</Text>
                      <Text style={s.bankItemFull} numberOfLines={1}>{item.fullName}</Text>
                    </View>
                    {selected && <Text style={s.bankItemCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={s.bankEmptyText}>검색 결과가 없습니다</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <FieldLabel label={t('worker.field_account_number', '계좌번호')} />
      <TextInput
        style={s.input}
        value={accountNumber}
        onChangeText={setAccountNumber}
        placeholder={t('worker.field_account_number_placeholder', '계좌번호를 입력하세요')}
        placeholderTextColor="#C0C4CF"
        keyboardType="numeric"
      />

      <FieldLabel label={t('worker.field_bank_book', '통장 사본')} />
      <TouchableOpacity style={s.photoZone} onPress={handlePickBook} disabled={saving} activeOpacity={0.7}>
        {bookUrl ? (
          <Image source={{ uri: bookUrl }} style={s.photoZoneImg} resizeMode="cover" />
        ) : (
          <View style={s.photoZonePlaceholderWrap}>
            <Text style={s.photoZonePlaceholderIcon}>🖼️</Text>
            <Text style={s.photoZonePlaceholderText}>{t('worker.photo_select', '사진 선택')}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={s.photoHint2}>통장 첫 페이지 사진을 등록해주세요 (은행명, 계좌번호, 예금주명).</Text>
      <View style={s.bankInfoNote}>
        <Text style={s.bankInfoNoteText}>계좌 정보는 급여 지급 목적으로만 사용됩니다.</Text>
      </View>

      <SaveBtn saving={saving} onPress={handleSave} />
    </View>
  );
}

// ── IdSection ─────────────────────────────────────────────────────────────────

function IdSection({
  profile,
  onSaved,
}: {
  profile: WorkerProfile;
  onSaved: (p: Partial<WorkerProfile>) => void;
}) {
  const { t } = useTranslation();
  const [idNumber, setIdNumber] = useState(profile.id_number ?? '');
  const [frontUrl, setFrontUrl] = useState<string | null>(profile.id_front_url);
  const [backUrl, setBackUrl] = useState<string | null>(profile.id_back_url);
  const [saving, setSaving] = useState(false);

  async function handlePickId(side: 'front' | 'back') {
    const dataUrl = await pickImage();
    if (!dataUrl) return;
    setSaving(true);
    try {
      const key = await uploadImageToApi(dataUrl, 'worker-id-docs');
      if (key) {
        const field = side === 'front' ? 'idFrontS3Key' : 'idBackS3Key';
        await api.put('/workers/me', { [field]: key });
        if (side === 'front') { setFrontUrl(dataUrl); onSaved({ id_front_url: dataUrl }); }
        else { setBackUrl(dataUrl); onSaved({ id_back_url: dataUrl }); }
      }
    } catch {
      showToast({ message: t('worker.id_upload_fail', '신분증 사진 업로드에 실패했습니다'), type: 'error' });
    } finally { setSaving(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/workers/me', { idNumber: idNumber.trim() || null });
      onSaved({ id_number: idNumber.trim() || null });
      showToast({ message: t('worker.id_save_success', '신분증 번호가 저장되었습니다'), type: 'success' });
    } catch (e) {
      showToast({ message: e instanceof ApiError ? e.message : t('common.save_fail', '저장에 실패했습니다'), type: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <View style={s.sectionBody}>
      <View style={s.idHeader}>
        <Text style={s.idSectionTitle}>신분증 등록</Text>
        {profile.id_verified && (
          <View style={s.verifiedBadge}><Text style={s.verifiedText}>✓ 인증됨</Text></View>
        )}
      </View>

      {/* Photo upload row */}
      <View style={s.idPhotoRow}>
        <View style={s.idPhotoCol}>
          <Text style={s.idPhotoColLabel}>앞면</Text>
          <TouchableOpacity
            style={[s.idPhotoZone, !!frontUrl && s.idPhotoZoneDone]}
            onPress={() => handlePickId('front')}
            disabled={saving}
            activeOpacity={0.7}
          >
            {frontUrl
              ? <Image source={{ uri: frontUrl }} style={s.idPhotoImg} resizeMode="cover" />
              : <View style={s.idPhotoPlaceholder}>
                  <Text style={s.idPhotoPlaceholderIcon}>🖼️</Text>
                  <Text style={s.idPhotoPlaceholderText}>사진 선택</Text>
                </View>
            }
          </TouchableOpacity>
        </View>
        <View style={s.idPhotoCol}>
          <Text style={s.idPhotoColLabel}>뒷면</Text>
          <TouchableOpacity
            style={[s.idPhotoZone, !!backUrl && s.idPhotoZoneDone]}
            onPress={() => handlePickId('back')}
            disabled={saving}
            activeOpacity={0.7}
          >
            {backUrl
              ? <Image source={{ uri: backUrl }} style={s.idPhotoImg} resizeMode="cover" />
              : <View style={s.idPhotoPlaceholder}>
                  <Text style={s.idPhotoPlaceholderIcon}>🖼️</Text>
                  <Text style={s.idPhotoPlaceholderText}>사진 선택</Text>
                </View>
            }
          </TouchableOpacity>
        </View>
      </View>

      <FieldLabel label={t('worker.field_id_number', 'ID 번호 (베트남 ID 또는 여권번호)')} />
      <TextInput
        style={s.input}
        value={idNumber}
        onChangeText={setIdNumber}
        placeholder={t('worker.field_id_number_placeholder', 'ID 번호를 입력하세요')}
        placeholderTextColor="#C0C4CF"
      />

      <SaveBtn saving={saving} onPress={handleSave} />
    </View>
  );
}

// ── SignatureSection ───────────────────────────────────────────────────────────

function SignatureSection({
  profile,
  onSaved,
}: {
  profile: WorkerProfile;
  onSaved: (p: Partial<WorkerProfile>) => void;
}) {
  const sigRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [currentSigUrl, setCurrentSigUrl] = useState<string | null>(profile.signature_url);
  const [showFullSig, setShowFullSig] = useState(false);

  async function handleSignatureOK(dataUrl: string) {
    if (!dataUrl || dataUrl === 'data:image/png;base64,') {
      showToast({ message: '서명을 그려주세요', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const key = await uploadImageToApi(dataUrl, 'worker-signatures');
      if (key) {
        await api.put('/workers/me', { signatureS3Key: key });
        setCurrentSigUrl(dataUrl);
        onSaved({ signature_url: dataUrl });
        showToast({ message: '서명이 저장되었습니다', type: 'success' });
      }
    } catch {
      showToast({ message: '서명 저장에 실패했습니다', type: 'error' });
    } finally { setSaving(false); }
  }

  async function handleDeleteSignature() {
    Alert.alert(
      '서명 삭제',
      '현재 서명을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive',
          onPress: async () => {
            try {
              await api.put('/workers/me', { signatureS3Key: null });
              setCurrentSigUrl(null);
              onSaved({ signature_url: null });
              showToast({ message: '서명이 삭제되었습니다', type: 'success' });
            } catch {
              showToast({ message: '삭제에 실패했습니다', type: 'error' });
            }
          },
        },
      ]
    );
  }

  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      width: 100%;
      height: 100%;
      background: #F9FAFB;
    }
    .m-signature-pad--body {
      border: 1.5px dashed #D1D5DB;
      border-radius: 12px;
      background: #F9FAFB;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body {
      background: transparent;
      margin: 0;
      padding: 0;
    }
  `;

  return (
    <View style={s.sectionBody}>
      {/* Current signature */}
      {currentSigUrl && (
        <View style={s.currentSigWrap}>
          <Text style={s.fieldLabel}>현재 서명</Text>
          <View style={s.currentSigPreview}>
            <Image source={{ uri: currentSigUrl }} style={s.currentSigImg} resizeMode="contain" />
          </View>
          <View style={s.sigActions}>
            <TouchableOpacity onPress={() => setShowFullSig(true)} activeOpacity={0.7}>
              <Text style={s.sigViewFullText}>전체 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteSignature} activeOpacity={0.7}>
              <Text style={s.sigDeleteText}>삭제</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.sigOverwriteNote}>아래에 새 서명을 그리면 현재 서명이 교체됩니다.</Text>
        </View>
      )}

      {/* Drawing canvas */}
      <Text style={s.fieldLabel}>새 서명</Text>
      <View style={s.sigCanvasWrap}>
        <SignatureCanvas
          ref={sigRef}
          onOK={handleSignatureOK}
          onEmpty={() => showToast({ message: '서명을 그려주세요', type: 'warning' })}
          webStyle={webStyle}
          backgroundColor="transparent"
          style={s.sigCanvas}
        />
      </View>
      <Text style={s.sigHint}>손가락 또는 마우스로 서명하세요</Text>

      {/* Action buttons */}
      <View style={s.sigBtnRow}>
        <TouchableOpacity
          style={s.sigClearBtn}
          onPress={() => sigRef.current?.clearSignature()}
          activeOpacity={0.7}
        >
          <Text style={s.sigClearBtnText}>지우기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.sigSaveBtn, saving && { opacity: 0.5 }]}
          onPress={() => sigRef.current?.readSignature()}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.sigSaveBtnText}>저장</Text>}
        </TouchableOpacity>
      </View>

      {/* Full signature modal */}
      <Modal visible={showFullSig} transparent animationType="fade" onRequestClose={() => setShowFullSig(false)}>
        <TouchableOpacity style={s.sigFullModal} activeOpacity={1} onPress={() => setShowFullSig(false)}>
          <View style={s.sigFullModalCard}>
            <Image source={{ uri: currentSigUrl! }} style={s.sigFullImg} resizeMode="contain" />
            <TouchableOpacity style={s.sigFullCloseBtn} onPress={() => setShowFullSig(false)}>
              <Text style={s.sigFullCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WorkerProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isManager } = useAuthStore();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [tradeSkills, setTradeSkills] = useState<TradeSkill[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const tabScrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const [profileData, skillsData, locationsData] = await Promise.allSettled([
        api.get<WorkerProfile>('/workers/me'),
        api.get<TradeSkill[]>('/workers/me/trade-skills'),
        api.get<SavedLocation[]>('/workers/saved-locations'),
      ]);
      if (profileData.status === 'fulfilled') setProfile(profileData.value);
      else setProfile({
        full_name: null, date_of_birth: null, gender: null, bio: null,
        primary_trade_id: null, trade_name_ko: null, experience_months: 0,
        current_province: null, current_district: null,
        id_number: null, id_verified: false, id_front_url: null, id_back_url: null,
        signature_url: null, bank_name: null, bank_account_number: null, bank_book_url: null,
        profile_image_url: null, phone: null, email: null,
      });
      if (skillsData.status === 'fulfilled') setTradeSkills(Array.isArray(skillsData.value) ? skillsData.value : []);
      if (locationsData.status === 'fulfilled') setSavedLocations(Array.isArray(locationsData.value) ? locationsData.value : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleProfileSaved(partial: Partial<WorkerProfile>) {
    setProfile(prev => prev ? { ...prev, ...partial } : prev);
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#0669F7" /></View>;
  }

  const p = profile!;
  const activeTabInfo = TABS.find(t => t.id === activeTab)!;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ── */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>{t('worker.profile_management', '프로필 관리')}</Text>
          <Text style={s.pageSubtitle}>{activeTabInfo.subtitle}</Text>
        </View>

        {/* ── Completion bar ── */}
        <CompletionBar
          profile={p}
          tradeSkills={tradeSkills}
          savedLocations={savedLocations}
        />

        {/* ── Tab bar ── */}
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabBar}
          contentContainerStyle={s.tabBarContent}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[s.tabBtn, activeTab === tab.id && s.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={s.tabIcon}>{tab.icon}</Text>
              <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Tab content ── */}
        <View style={s.tabContent}>
          {activeTab === 'basic' && (
            <BasicSection profile={p} onSaved={handleProfileSaved} />
          )}
          {activeTab === 'skills' && (
            <SkillsSection onSkillsChange={setTradeSkills} />
          )}
          {activeTab === 'address' && (
            <AddressSection onLocationsChange={setSavedLocations} />
          )}
          {activeTab === 'bank' && (
            <BankSection profile={p} onSaved={handleProfileSaved} />
          )}
          {activeTab === 'id' && (
            <IdSection profile={p} onSaved={handleProfileSaved} />
          )}
          {activeTab === 'signature' && (
            <SignatureSection profile={p} onSaved={handleProfileSaved} />
          )}
        </View>

        {/* ── Manager switch ── */}
        {isManager && (
          <TouchableOpacity
            style={s.managerSwitchBtn}
            onPress={() => router.navigate('/(manager)/' as never)}
            activeOpacity={0.8}
          >
            <Text style={s.managerSwitchText}>{t('worker.switch_to_manager', '관리자 모드로 전환')} →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Page header
  pageHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#6B7280' },

  // Completion bar
  completionCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#DBEAFE',
    gap: 6,
  },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  completionPct: { fontSize: 16, fontWeight: '800', color: '#0669F7' },
  completionTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  completionFill: { height: '100%', backgroundColor: '#0669F7', borderRadius: 4 },
  completionSub: { fontSize: 11, color: '#0669F7' },

  // Tab bar
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabBarContent: { paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  tabBtnActive: { backgroundColor: '#EFF5FF' },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabLabelActive: { color: '#0669F7', fontWeight: '700' },

  // Tab content wrapper
  tabContent: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },

  // Section body
  sectionBody: { padding: 16 },

  // Photo section (Basic Info)
  photoSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EFF5FF', borderWidth: 2, borderColor: '#BFDBFE',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholderIcon: { fontSize: 28 },
  photoActions: { flex: 1, gap: 6 },
  photoChangBtn: {
    backgroundColor: '#0669F7', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center',
  },
  photoChangeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  photoDeleteBtn: {
    borderRadius: 8, borderWidth: 1.5, borderColor: '#EF4444',
    paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center',
  },
  photoDeleteBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  photoHint: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

  // Form fields
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14, color: '#111827',
  },
  charCount: { fontSize: 10, color: '#9CA3AF', textAlign: 'right', marginTop: 3 },

  // Gender
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center',
  },
  genderBtnActive: { borderColor: '#0669F7', backgroundColor: '#EFF5FF' },
  genderText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  genderTextActive: { color: '#0669F7' },

  // Phone row
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    gap: 8,
  },
  phoneValue: { flex: 1, fontSize: 14, color: '#111827' },
  changeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#0669F7',
  },
  changeBtnText: { color: '#0669F7', fontSize: 12, fontWeight: '700' },

  // Save button
  saveBtn: {
    flex: 1, marginTop: 20, backgroundColor: '#0669F7',
    borderRadius: 50, paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Skills section
  selectedSkillsWrap: { marginBottom: 4 },
  skillRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F7FF', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#BFDBFE',
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, gap: 8,
  },
  skillName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0669F7' },
  skillYearsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  skillYearsInput: {
    width: 40, borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE',
    backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 4,
    fontSize: 13, color: '#111827', textAlign: 'center',
  },
  skillYearsLabel: { fontSize: 12, color: '#6B7280' },
  skillRemoveBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
  },
  skillRemoveIcon: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tradeListWrap: { marginTop: 4 },
  tradeListItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 0.5, borderColor: '#F0F0F0',
  },
  tradeListItemActive: { backgroundColor: '#F0F7FF' },
  tradeListItemText: { fontSize: 14, color: '#374151' },
  tradeListItemTextActive: { color: '#0669F7', fontWeight: '600' },
  tradeCheckmark: { fontSize: 14, color: '#0669F7', fontWeight: '700' },
  skillsHint: { fontSize: 11, color: '#6B7280', marginTop: 10, marginBottom: 2 },

  // Address section
  emptyAddress: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyAddressIcon: { fontSize: 32, opacity: 0.3 },
  emptyAddressText: { fontSize: 14, color: '#9CA3AF' },
  locationList: { gap: 10, marginBottom: 12 },
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 12, gap: 8,
  },
  locationInfo: { flex: 1, gap: 2 },
  locationLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  locationAddress: { fontSize: 12, color: '#6B7280' },
  defaultBadge: {
    alignSelf: 'flex-start', backgroundColor: '#DCFCE7',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 2,
  },
  defaultBadgeText: { fontSize: 10, color: '#16A34A', fontWeight: '600' },
  locationDeleteBtn: { padding: 4 },
  locationDeleteText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  addAddressForm: {
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, marginBottom: 12,
  },
  formBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelFormBtn: {
    flex: 1, marginTop: 20, borderRadius: 50,
    paddingVertical: 13, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  cancelFormBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  addAddressBtn: {
    marginTop: 4, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#0669F7',
    borderStyle: 'dashed', borderRadius: 12, alignItems: 'center',
  },
  addAddressBtnText: { color: '#0669F7', fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  chipActive: { borderColor: '#0669F7', backgroundColor: '#EFF5FF' },
  chipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#0669F7', fontWeight: '700' },

  // Bank section
  bankSelectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bankSelectText: { fontSize: 14, color: '#111827', flex: 1 },
  bankSelectPlaceholder: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  bankSelectChevron: { fontSize: 14, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bankSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '80%',
  },
  bankSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  bankSearchInput: {
    backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', marginBottom: 8,
  },
  bankList: { maxHeight: 400 },
  bankItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 0.5, borderColor: '#F0F0F0',
  },
  bankItemActive: { backgroundColor: '#EFF5FF', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -4 },
  bankItemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bankItemNameActive: { color: '#0669F7' },
  bankItemFull: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  bankItemCheck: { fontSize: 14, color: '#0669F7', fontWeight: '700', marginLeft: 8 },
  bankEmptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingVertical: 24 },
  photoZone: {
    height: 130, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderStyle: 'dashed', backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  photoZoneImg: { width: '100%', height: '100%' },
  photoZonePlaceholderWrap: { alignItems: 'center', gap: 6 },
  photoZonePlaceholderIcon: { fontSize: 28, opacity: 0.4 },
  photoZonePlaceholderText: { fontSize: 13, color: '#9CA3AF' },
  photoHint2: { fontSize: 11, color: '#6B7280', marginTop: 6, lineHeight: 16 },
  bankInfoNote: {
    marginTop: 8, backgroundColor: '#F0F7FF', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: '#DBEAFE',
  },
  bankInfoNoteText: { fontSize: 12, color: '#1E40AF' },

  // ID section
  idHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  idSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  verifiedBadge: {
    backgroundColor: '#DCFCE7', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  idPhotoRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  idPhotoCol: { flex: 1, gap: 4 },
  idPhotoColLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  idPhotoZone: {
    height: 110, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderStyle: 'dashed', backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  idPhotoZoneDone: { borderColor: '#86EFAC', borderStyle: 'solid', backgroundColor: '#F0FDF4' },
  idPhotoImg: { width: '100%', height: '100%' },
  idPhotoPlaceholder: { alignItems: 'center', gap: 4 },
  idPhotoPlaceholderIcon: { fontSize: 24, opacity: 0.4 },
  idPhotoPlaceholderText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  // Signature section
  currentSigWrap: { marginBottom: 16 },
  currentSigPreview: {
    height: 100, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB', overflow: 'hidden',
  },
  currentSigImg: { width: '100%', height: '100%' },
  sigActions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  sigViewFullText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sigDeleteText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  sigOverwriteNote: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  sigCanvasWrap: {
    height: 200, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    overflow: 'hidden', backgroundColor: '#F9FAFB', marginTop: 4,
  },
  sigCanvas: { flex: 1 },
  sigHint: { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  sigBtnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  sigClearBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 50, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff',
  },
  sigClearBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  sigSaveBtn: {
    flex: 2, backgroundColor: '#0669F7',
    borderRadius: 50, paddingVertical: 13, alignItems: 'center',
  },
  sigSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sigFullModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  sigFullModalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', gap: 16,
  },
  sigFullImg: { width: '100%', height: 200 },
  sigFullCloseBtn: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  sigFullCloseBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  // Manager switch
  managerSwitchBtn: {
    marginHorizontal: 16, marginTop: 16, padding: 14,
    borderRadius: 12, backgroundColor: '#0669F7', alignItems: 'center',
  },
  managerSwitchText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
