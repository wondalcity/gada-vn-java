import { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal, FlatList,
  Alert, PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useTranslation } from 'react-i18next';
import i18n from '../../../lib/i18n';
import { api, ApiError } from '../../../lib/api-client';
import { showToast } from '../../../lib/toast';
import DatePickerField from '../../../components/DatePickerField';
import { Colors, Radius, Spacing, Font } from '../../../constants/theme';

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

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

// ── NativeSignatureCanvas (pure RN — no react-native-webview needed) ─────────

interface SigPoint { x: number; y: number }
type SigStroke = SigPoint[]

interface NativeSignatureCanvasRef {
  clearSignature: () => void;
  readSignature: () => void;
}

function strokesToSvgDataUrl(strokes: SigStroke[], w: number, h: number): string {
  let pathData = '';
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      const { x, y } = stroke[0];
      pathData += `M${x.toFixed(1)} ${y.toFixed(1)}l1 1 `;
    } else {
      pathData += `M${stroke[0].x.toFixed(1)} ${stroke[0].y.toFixed(1)}`;
      for (let i = 1; i < stroke.length; i++) {
        pathData += `L${stroke[i].x.toFixed(1)} ${stroke[i].y.toFixed(1)}`;
      }
      pathData += ' ';
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="white"/><path d="${pathData.trim()}" stroke="#25282A" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

const NativeSignatureCanvas = forwardRef<NativeSignatureCanvasRef, {
  onOK: (dataUrl: string) => void;
  onEmpty: () => void;
  style?: object;
}>(function NativeSignatureCanvas({ onOK, onEmpty, style }, ref) {
  const [renderKey, setRenderKey] = useState(0);
  const committedRef = useRef<SigStroke[]>([]);
  const activeRef = useRef<SigPoint[]>([]);
  const sizeRef = useRef({ w: 300, h: 200 });

  useImperativeHandle(ref, () => ({
    clearSignature() {
      committedRef.current = [];
      activeRef.current = [];
      setRenderKey(k => k + 1);
    },
    readSignature() {
      const strokes = [
        ...committedRef.current,
        ...(activeRef.current.length > 0 ? [[...activeRef.current]] : []),
      ];
      if (strokes.length === 0) { onEmpty(); return; }
      const { w, h } = sizeRef.current;
      onOK(strokesToSvgDataUrl(strokes, w, h));
    },
  }), [onOK, onEmpty]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      activeRef.current = [{ x, y }];
      setRenderKey(k => k + 1);
    },
    onPanResponderMove: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      activeRef.current.push({ x, y });
      if (activeRef.current.length % 6 === 0) {
        setRenderKey(k => k + 1);
      }
    },
    onPanResponderRelease: () => {
      if (activeRef.current.length > 0) {
        committedRef.current = [...committedRef.current, [...activeRef.current]];
        activeRef.current = [];
        setRenderKey(k => k + 1);
      }
    },
  }), []);

  const allStrokes = [
    ...committedRef.current,
    ...(activeRef.current.length > 0 ? [[...activeRef.current]] : []),
  ];

  const segments: React.ReactElement[] = [];
  let segKey = 0;
  for (const stroke of allStrokes) {
    if (stroke.length === 1) {
      segments.push(
        <View key={segKey++} style={{
          position: 'absolute',
          left: stroke[0].x - 1.5,
          top: stroke[0].y - 1.5,
          width: 3, height: 3,
          backgroundColor: '#25282A',
          borderRadius: 1.5,
        }} />,
      );
      continue;
    }
    for (let i = 1; i < stroke.length; i++) {
      const { x: x1, y: y1 } = stroke[i - 1];
      const { x: x2, y: y2 } = stroke[i];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.3) continue;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      segments.push(
        <View key={segKey++} style={{
          position: 'absolute',
          left: cx - len / 2,
          top: cy - 1.5,
          width: len,
          height: 3,
          backgroundColor: '#25282A',
          borderRadius: 1.5,
          transform: [{ rotate: `${angleDeg}deg` }],
        }} />,
      );
    }
  }

  return (
    <View
      style={[{ overflow: 'hidden', backgroundColor: '#F9FAFB' }, style]}
      onLayout={(e) => {
        sizeRef.current = {
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        };
      }}
      {...panResponder.panHandlers}
    >
      {segments}
    </View>
  );
});

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

interface SelectedPlace {
  address: string;
  lat: number;
  lng: number;
  province: string;
  district: string;
}

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
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);

  useEffect(() => {
    api.get<SavedLocation[]>('/workers/saved-locations')
      .then(res => setLocations(Array.isArray(res) ? res : []))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setNewLabel('');
    setSelectedPlace(null);
    setShowAddForm(false);
  }

  async function handleAdd() {
    if (!selectedPlace) {
      showToast({ message: '주소를 검색해서 선택해주세요', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const label = newLabel.trim() || selectedPlace.province || selectedPlace.address.split(',')[0];
      const payload: Record<string, any> = {
        label,
        address: selectedPlace.address,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        province: selectedPlace.province,
        district: selectedPlace.district,
        isDefault: locations.length === 0,
      };
      const res = await api.post<SavedLocation>('/workers/saved-locations', payload);
      const updated = [...locations, res];
      setLocations(updated);
      onLocationsChange(updated);
      resetForm();
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
      {/* Saved locations list */}
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
                {loc.lat != null && loc.lng != null && (
                  <Text style={s.locationCoords}>{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</Text>
                )}
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
          <FieldLabel label="주소 명칭" />
          <TextInput
            style={s.input}
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="예: 집, 회사, 현장"
            placeholderTextColor="#C0C4CF"
          />

          {/* Google Places Autocomplete */}
          <View style={{ zIndex: 10 }}>
            <FieldLabel label="주소 검색" />
            <GooglePlacesAutocomplete
              placeholder="주소를 검색하고 목록에서 선택하세요."
              minLength={2}
              fetchDetails
              onPress={(data, details) => {
                if (!details?.geometry) return;
                let province = '';
                let district = '';
                for (const comp of details.address_components ?? []) {
                  if (comp.types.includes('administrative_area_level_1')) province = comp.long_name;
                  if (comp.types.includes('administrative_area_level_2')) district = comp.long_name;
                }
                setSelectedPlace({
                  address: data.description,
                  lat: details.geometry.location.lat,
                  lng: details.geometry.location.lng,
                  province,
                  district,
                });
              }}
              query={{
                key: PLACES_API_KEY,
                language: 'vi',
                components: 'country:vn',
              }}
              renderLeftButton={() => (
                <View style={s.placesSearchIcon}>
                  <Text style={{ fontSize: 16 }}>🔍</Text>
                </View>
              )}
              styles={{
                container: { flex: 0 },
                textInputContainer: {
                  backgroundColor: Colors.surface,
                  borderRadius: Radius.md,
                  borderWidth: 1.5,
                  borderColor: Colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  shadowColor: Colors.primary,
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 2,
                },
                textInput: {
                  backgroundColor: 'transparent',
                  color: Colors.onSurface,
                  fontSize: 14,
                  height: 46,
                  marginBottom: 0,
                  flex: 1,
                },
                listView: {
                  position: 'absolute',
                  top: 50,
                  left: 0,
                  right: 0,
                  borderWidth: 1,
                  borderColor: Colors.outline,
                  borderRadius: Radius.md,
                  backgroundColor: Colors.surface,
                  elevation: 8,
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  zIndex: 9999,
                },
                row: {
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: Colors.outline,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                },
                description: {
                  fontSize: 13,
                  color: Colors.onSurface,
                },
                poweredContainer: { display: 'none' },
              }}
              renderRow={(data) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 14 }}>📍</Text>
                  <Text style={{ fontSize: 13, color: Colors.onSurface, flex: 1 }} numberOfLines={2}>
                    {data.description}
                  </Text>
                </View>
              )}
              enablePoweredByContainer={false}
              keyboardShouldPersistTaps="handled"
              listViewDisplayed="auto"
            />

            {/* Selected address card */}
            {selectedPlace && (
              <View style={s.addressCard}>
                <Text style={s.addressCardPin}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.addressCardText}>{selectedPlace.address}</Text>
                  {(selectedPlace.province || selectedPlace.district) && (
                    <Text style={s.addressCardMeta}>
                      {[selectedPlace.province, selectedPlace.district].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  <Text style={s.addressCardCoords}>
                    {selectedPlace.lat.toFixed(5)}, {selectedPlace.lng.toFixed(5)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={s.formBtnRow}>
            <TouchableOpacity
              style={s.cancelFormBtn}
              onPress={resetForm}
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
  const sigRef = useRef<NativeSignatureCanvasRef>(null);
  const [saving, setSaving] = useState(false);
  const [currentSigUrl, setCurrentSigUrl] = useState<string | null>(profile.signature_url);
  const [showFullSig, setShowFullSig] = useState(false);

  async function handleSignatureOK(dataUrl: string) {
    if (!dataUrl) {
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
        <NativeSignatureCanvas
          ref={sigRef}
          onOK={handleSignatureOK}
          onEmpty={() => showToast({ message: '서명을 그려주세요', type: 'warning' })}
          style={s.sigCanvas}
        />
      </View>
      <Text style={s.sigHint}>손가락으로 서명을 그려주세요</Text>

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles (GADA Design System tokens) ───────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Page header
  pageHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  pageTitle: { ...Font.t1, color: Colors.onSurface, marginBottom: Spacing.xs },
  pageSubtitle: { ...Font.body3, color: Colors.onSurfaceVariant },

  // Completion bar
  completionCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: Colors.primaryContainer,
    gap: Spacing.xs,
  },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionLabel: { ...Font.body3, color: Colors.onSurface, fontWeight: '500' },
  completionPct: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  completionTrack: { height: 8, backgroundColor: Colors.outline, borderRadius: Radius.xs, overflow: 'hidden' },
  completionFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.xs },
  completionSub: { ...Font.caption, color: Colors.primary },

  // Tab bar
  tabBar: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.outline },
  tabBarContent: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, gap: Spacing.xs },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  tabBtnActive: { backgroundColor: Colors.primaryContainer },
  tabIcon: { fontSize: 14 },
  tabLabel: { ...Font.body3, fontWeight: '500', color: Colors.onSurfaceVariant },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },

  // Tab content wrapper
  tabContent: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    borderRadius: Radius.lg, overflow: 'hidden',
    shadowColor: Colors.shadowBlack, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },

  // Section body
  sectionBody: { padding: Spacing.lg },

  // Photo section (Basic Info)
  photoSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryContainer, borderWidth: 2, borderColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholderIcon: { fontSize: 28 },
  photoActions: { flex: 1, gap: Spacing.sm },
  photoChangBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, alignItems: 'center',
  },
  photoChangeBtnText: { color: Colors.onPrimary, fontSize: 13, fontWeight: '700' },
  photoDeleteBtn: {
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.error,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, alignItems: 'center',
  },
  photoDeleteBtnText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
  photoHint: { ...Font.caption, color: Colors.disabled, marginTop: 2 },

  // Form fields
  fieldLabel: { ...Font.caption, fontWeight: '600', color: Colors.onSurfaceVariant, marginTop: Spacing.md, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surfaceDim, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outline,
    paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    ...Font.body3, color: Colors.onSurface,
  },
  charCount: { ...Font.caption, color: Colors.disabled, textAlign: 'right', marginTop: 3 },

  // Gender
  genderRow: { flexDirection: 'row', gap: Spacing.sm },
  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.outline, alignItems: 'center',
  },
  genderBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  genderText: { fontSize: 13, fontWeight: '600', color: Colors.disabled },
  genderTextActive: { color: Colors.primary },

  // Phone row
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceDim, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outline,
    paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    gap: Spacing.sm,
  },
  phoneValue: { flex: 1, ...Font.body3, color: Colors.onSurface },
  changeBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.primary,
  },
  changeBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },

  // Save button
  saveBtn: {
    flex: 1, marginTop: Spacing.xl, backgroundColor: Colors.primary,
    borderRadius: Radius.pill, paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  // Skills section
  selectedSkillsWrap: { marginBottom: Spacing.xs },
  skillRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primaryContainer, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  skillName: { flex: 1, ...Font.body3, fontWeight: '600', color: Colors.primary },
  skillYearsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  skillYearsInput: {
    width: 40, borderRadius: Radius.xs, borderWidth: 1, borderColor: Colors.primaryContainer,
    backgroundColor: Colors.surface, paddingHorizontal: 6, paddingVertical: 4,
    fontSize: 13, color: Colors.onSurface, textAlign: 'center',
  },
  skillYearsLabel: { ...Font.caption, color: Colors.onSurfaceVariant },
  skillRemoveBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center',
  },
  skillRemoveIcon: { color: Colors.onError, fontSize: 10, fontWeight: '700' },
  tradeListWrap: { marginTop: Spacing.xs },
  tradeListItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: Spacing.xs,
    borderBottomWidth: 0.5, borderColor: Colors.outline,
  },
  tradeListItemActive: { backgroundColor: Colors.primaryContainer },
  tradeListItemText: { ...Font.body3, color: Colors.onSurface },
  tradeListItemTextActive: { color: Colors.primary, fontWeight: '600' },
  tradeCheckmark: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  skillsHint: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 10, marginBottom: 2 },

  // Address section
  emptyAddress: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.sm },
  emptyAddressIcon: { fontSize: 32, opacity: 0.3 },
  emptyAddressText: { ...Font.body3, color: Colors.disabled },
  locationList: { gap: 10, marginBottom: Spacing.md },
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceDim, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outline,
    padding: Spacing.md, gap: Spacing.sm,
  },
  locationInfo: { flex: 1, gap: 2 },
  locationLabel: { ...Font.body3, fontWeight: '600', color: Colors.onSurface },
  locationAddress: { ...Font.caption, color: Colors.onSurfaceVariant },
  locationCoords: { fontSize: 10, color: Colors.disabled, marginTop: 1 },
  defaultBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.successContainer,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.xs, marginBottom: 2,
  },
  defaultBadgeText: { fontSize: 10, color: Colors.onSuccessContainer, fontWeight: '600' },
  locationDeleteBtn: { padding: Spacing.xs },
  locationDeleteText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  addAddressForm: {
    backgroundColor: Colors.surfaceDim, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outline,
    padding: 14, marginBottom: Spacing.md,
  },
  formBtnRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.xs },
  cancelFormBtn: {
    flex: 1, marginTop: Spacing.xl, borderRadius: Radius.pill,
    paddingVertical: 13, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.outline,
  },
  cancelFormBtnText: { color: Colors.onSurface, fontWeight: '600', fontSize: 15 },
  addAddressBtn: {
    marginTop: Spacing.xs, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.primary,
    borderStyle: 'dashed', borderRadius: Radius.md, alignItems: 'center',
  },
  addAddressBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  // Places search icon
  placesSearchIcon: {
    paddingLeft: 4,
    paddingRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Address card (selected place preview)
  addressCard: {
    marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: Colors.primaryContainer, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primaryContainer,
    padding: 12,
  },
  addressCardPin: { fontSize: 16, marginTop: 1 },
  addressCardText: { ...Font.body3, fontWeight: '600', color: Colors.onSurface, flexShrink: 1 },
  addressCardMeta: { ...Font.caption, color: Colors.primary, marginTop: 2 },
  addressCardCoords: { fontSize: 10, color: Colors.disabled, marginTop: 2 },
  // Fallback notice
  fallbackNotice: {
    marginBottom: Spacing.sm, backgroundColor: '#FFF8E6',
    borderWidth: 1, borderColor: '#F5D87D', borderRadius: Radius.sm, padding: 10,
  },
  fallbackNoticeText: { fontSize: 12, color: '#92620A' },

  // Bank section
  bankSelectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bankSelectText: { ...Font.body3, color: Colors.onSurface, flex: 1 },
  bankSelectPlaceholder: { ...Font.body3, color: Colors.disabled, flex: 1 },
  bankSelectChevron: { fontSize: 14, color: Colors.disabled },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay30, justifyContent: 'flex-end' },
  bankSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.pill, borderTopRightRadius: Radius.pill,
    padding: Spacing.xl, paddingBottom: 40, maxHeight: '80%',
  },
  bankSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.outline, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Font.t3, color: Colors.onSurface, marginBottom: Spacing.lg, textAlign: 'center' },
  bankSearchInput: {
    backgroundColor: Colors.surfaceDim, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.outline,
    paddingHorizontal: Spacing.md, paddingVertical: 10, ...Font.body3, color: Colors.onSurface, marginBottom: Spacing.sm,
  },
  bankList: { maxHeight: 400 },
  bankItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.xs,
    borderBottomWidth: 0.5, borderColor: Colors.outline,
  },
  bankItemActive: { backgroundColor: Colors.primaryContainer, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, marginHorizontal: -4 },
  bankItemName: { ...Font.body3, fontWeight: '600', color: Colors.onSurface },
  bankItemNameActive: { color: Colors.primary },
  bankItemFull: { ...Font.caption, color: Colors.disabled, marginTop: 1 },
  bankItemCheck: { fontSize: 14, color: Colors.primary, fontWeight: '700', marginLeft: Spacing.sm },
  bankEmptyText: { textAlign: 'center', color: Colors.disabled, fontSize: 14, paddingVertical: 24 },
  photoZone: {
    height: 130, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.outline,
    borderStyle: 'dashed', backgroundColor: Colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  photoZoneImg: { width: '100%', height: '100%' },
  photoZonePlaceholderWrap: { alignItems: 'center', gap: Spacing.sm },
  photoZonePlaceholderIcon: { fontSize: 28, opacity: 0.4 },
  photoZonePlaceholderText: { fontSize: 13, color: Colors.disabled },
  photoHint2: { ...Font.caption, color: Colors.onSurfaceVariant, marginTop: 6, lineHeight: 16 },
  bankInfoNote: {
    marginTop: Spacing.sm, backgroundColor: Colors.primaryContainer, borderRadius: Radius.sm,
    padding: 10, borderWidth: 1, borderColor: Colors.primaryContainer,
  },
  bankInfoNoteText: { ...Font.caption, color: Colors.primaryDark },

  // ID section
  idHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  idSectionTitle: { ...Font.t4, color: Colors.onSurface },
  verifiedBadge: {
    backgroundColor: Colors.successContainer, borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: Colors.onSuccessContainer },
  idPhotoRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  idPhotoCol: { flex: 1, gap: Spacing.xs },
  idPhotoColLabel: { ...Font.caption, fontWeight: '600', color: Colors.onSurfaceVariant },
  idPhotoZone: {
    height: 110, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.outline,
    borderStyle: 'dashed', backgroundColor: Colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  idPhotoZoneDone: { borderColor: Colors.success, borderStyle: 'solid', backgroundColor: Colors.successContainer },
  idPhotoImg: { width: '100%', height: '100%' },
  idPhotoPlaceholder: { alignItems: 'center', gap: Spacing.xs },
  idPhotoPlaceholderIcon: { fontSize: 24, opacity: 0.4 },
  idPhotoPlaceholderText: { fontSize: 11, color: Colors.disabled, fontWeight: '500' },

  // Signature section
  currentSigWrap: { marginBottom: Spacing.lg },
  currentSigPreview: {
    height: 100, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.outline,
    backgroundColor: Colors.surfaceDim, overflow: 'hidden',
  },
  currentSigImg: { width: '100%', height: '100%' },
  sigActions: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.sm },
  sigViewFullText: { ...Font.body3, color: Colors.onSurfaceVariant, fontWeight: '500' },
  sigDeleteText: { ...Font.body3, color: Colors.error, fontWeight: '600' },
  sigOverwriteNote: { ...Font.caption, color: Colors.disabled, marginTop: Spacing.sm },
  sigCanvasWrap: {
    height: 200, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.outline,
    overflow: 'hidden', backgroundColor: Colors.surfaceDim, marginTop: Spacing.xs,
  },
  sigCanvas: { flex: 1 },
  sigHint: { ...Font.caption, color: Colors.disabled, marginTop: Spacing.xs, textAlign: 'center' },
  sigBtnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  sigClearBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.outline,
    borderRadius: Radius.pill, paddingVertical: 13, alignItems: 'center', backgroundColor: Colors.surface,
  },
  sigClearBtnText: { color: Colors.onSurface, fontWeight: '600', fontSize: 15 },
  sigSaveBtn: {
    flex: 2, backgroundColor: Colors.primary,
    borderRadius: Radius.pill, paddingVertical: 13, alignItems: 'center',
  },
  sigSaveBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
  sigFullModal: { flex: 1, backgroundColor: Colors.overlay80, justifyContent: 'center', alignItems: 'center' },
  sigFullModalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl, width: '90%', gap: Spacing.lg,
  },
  sigFullImg: { width: '100%', height: 200 },
  sigFullCloseBtn: { backgroundColor: Colors.surfaceContainer, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  sigFullCloseBtnText: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },

  // Manager switch
  managerSwitchBtn: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg, padding: 14,
    borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center',
  },
  managerSwitchText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '700' },
});
