'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LANGUAGES, changeAppLanguage, LangCode } from '../../lib/i18n';
import { api, ApiError } from '../../lib/api-client';
import { useAuthStore } from '../../store/auth.store';

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  const p = phone.trim()
  if (p.startsWith('+84')) {
    const d = p.slice(3)
    if (d.length === 9) return `+84 ${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
  }
  if (p.startsWith('+82')) {
    const d = p.slice(3)
    if (d.length >= 9) return `+82 ${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(d.length - 4)}`
  }
  return p
}

// ── Types ────────────────────────────────────────────────────────────────────

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

type Section = 'basic' | 'bank' | 'id' | null;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(i18n.t('common.permission_required'), i18n.t('common.photo_permission'));
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
    // Send base64 image to API for upload
    const res = await api.post<{ key: string }>('/files/upload-base64', { dataUrl, folder });
    return res.key;
  } catch {
    // Return dataUrl as-is if upload fails (local dev)
    return dataUrl;
  }
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({
  title, icon, isOpen, onToggle, badge, badgeDone,
}: {
  title: string; icon: string; isOpen: boolean; onToggle: () => void; badge?: string; badgeDone?: boolean;
}) {
  return (
    <TouchableOpacity style={sec.header} onPress={onToggle} activeOpacity={0.7}>
      <View style={sec.headerLeft}>
        <Text style={sec.icon}>{icon}</Text>
        <Text style={sec.title}>{title}</Text>
        {badge ? (
          <View style={[sec.badge, badgeDone ? sec.badgeDone : sec.badgeWarn]}>
            <Text style={[sec.badgeText, badgeDone ? sec.badgeTextDone : sec.badgeTextWarn]}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={sec.arrow}>{isOpen ? '▲' : '▽'}</Text>
    </TouchableOpacity>
  );
}

// ── Basic Info Section ────────────────────────────────────────────────────────

function BasicSection({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [dob, setDob] = useState(profile.date_of_birth?.split('T')[0] ?? '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>(profile.gender ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
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
      }
    } catch { Alert.alert(t('common.error'), t('worker.avatar_upload_fail')); }
    finally { setSaving(false); }
  }

  async function handleSave() {
    if (!fullName.trim()) { Alert.alert(t('common.confirm'), t('worker.name_required')); return; }
    setSaving(true);
    try {
      await api.put('/workers/me', {
        fullName: fullName.trim(),
        dateOfBirth: dob || null,
        gender: gender || null,
        bio: bio.trim() || null,
      });
      onSaved({ full_name: fullName.trim(), date_of_birth: dob || null, gender: (gender || null) as 'MALE' | 'FEMALE' | 'OTHER' | null, bio: bio.trim() || null });
      Alert.alert(t('common.save_complete'), t('worker.basic_save_success'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof ApiError ? e.message : t('common.save_fail'));
    } finally { setSaving(false); }
  }

  return (
    <View style={sec.body}>
      {/* Avatar */}
      <TouchableOpacity style={s.avatarRow} onPress={handlePickAvatar} disabled={saving} activeOpacity={0.7}>
        <View style={s.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarPlaceholder}>👤</Text>
          )}
        </View>
        <Text style={s.avatarCta}>{avatarUrl ? t('worker.avatar_change') : t('worker.avatar_register')}</Text>
      </TouchableOpacity>

      <FieldLabel label={t('worker.field_name')} />
      <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder={t('worker.field_name_placeholder')} placeholderTextColor="#C0C4CF" />

      <FieldLabel label={t('worker.field_dob')} />
      <TextInput style={s.input} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" placeholderTextColor="#C0C4CF" keyboardType="numeric" />

      <FieldLabel label={t('worker.field_gender')} />
      <View style={s.genderRow}>
        {(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (
          <TouchableOpacity
            key={g} style={[s.genderBtn, gender === g && s.genderBtnActive]}
            onPress={() => setGender(g === gender ? '' : g)} activeOpacity={0.7}
          >
            <Text style={[s.genderText, gender === g && s.genderTextActive]}>
              {g === 'MALE' ? t('worker.gender_male') : g === 'FEMALE' ? t('worker.gender_female') : t('worker.gender_other')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FieldLabel label={t('worker.field_bio')} />
      <TextInput
        style={[s.input, { height: 80, textAlignVertical: 'top' }]}
        value={bio} onChangeText={setBio}
        placeholder={t('worker.field_bio_placeholder')} placeholderTextColor="#C0C4CF"
        multiline maxLength={300}
      />

      <SaveBtn saving={saving} onPress={handleSave} />
    </View>
  );
}

// ── Bank Section ──────────────────────────────────────────────────────────────

function BankSection({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const { t } = useTranslation();
  const [bankName, setBankName] = useState(profile.bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(profile.bank_account_number ?? '');
  const [bookUrl, setBookUrl] = useState<string | null>(profile.bank_book_url);
  const [saving, setSaving] = useState(false);

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
    } catch { Alert.alert(t('common.error'), t('worker.bank_book_upload_fail')); }
    finally { setSaving(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/workers/me', {
        bankName: bankName.trim() || null,
        bankAccountNumber: accountNumber.trim() || null,
      });
      onSaved({ bank_name: bankName.trim() || null, bank_account_number: accountNumber.trim() || null });
      Alert.alert(t('common.save_complete'), t('worker.bank_save_success'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof ApiError ? e.message : t('common.save_fail'));
    } finally { setSaving(false); }
  }

  return (
    <View style={sec.body}>
      <FieldLabel label={t('worker.field_bank_name')} />
      <TextInput style={s.input} value={bankName} onChangeText={setBankName} placeholder="예: Vietcombank, BIDV" placeholderTextColor="#C0C4CF" />

      <FieldLabel label={t('worker.field_account_number')} />
      <TextInput style={s.input} value={accountNumber} onChangeText={setAccountNumber} placeholder={t('worker.field_account_number_placeholder')} placeholderTextColor="#C0C4CF" keyboardType="numeric" />

      <FieldLabel label={t('worker.field_bank_book')} />
      <TouchableOpacity style={s.photoZone} onPress={handlePickBook} disabled={saving} activeOpacity={0.7}>
        {bookUrl ? (
          <Image source={{ uri: bookUrl }} style={s.photoZoneImg} resizeMode="cover" />
        ) : (
          <Text style={s.photoZonePlaceholder}>{t('worker.photo_select')}</Text>
        )}
      </TouchableOpacity>

      <SaveBtn saving={saving} onPress={handleSave} />
    </View>
  );
}

// ── ID Section ────────────────────────────────────────────────────────────────

function IdSection({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
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
    } catch { Alert.alert(t('common.error'), t('worker.id_upload_fail')); }
    finally { setSaving(false); }
  }

  async function handleSaveNumber() {
    setSaving(true);
    try {
      await api.put('/workers/me', { idNumber: idNumber.trim() || null });
      onSaved({ id_number: idNumber.trim() || null });
      Alert.alert(t('common.save_complete'), t('worker.id_save_success'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof ApiError ? e.message : t('common.save_fail'));
    } finally { setSaving(false); }
  }

  return (
    <View style={sec.body}>
      {profile.id_verified && (
        <View style={s.verifiedBadge}>
          <Text style={s.verifiedText}>{t('worker.id_verified')}</Text>
        </View>
      )}

      <FieldLabel label={t('worker.field_id_number')} />
      <TextInput style={s.input} value={idNumber} onChangeText={setIdNumber} placeholder={t('worker.field_id_number_placeholder')} placeholderTextColor="#C0C4CF" />
      <SaveBtn saving={saving} onPress={handleSaveNumber} label={t('worker.number_save')} />

      <View style={{ height: 12 }} />
      <FieldLabel label={t('worker.field_id_photo')} />
      <View style={s.idPhotoRow}>
        <TouchableOpacity style={[s.idPhotoZone, !!frontUrl && s.idPhotoZoneDone]} onPress={() => handlePickId('front')} disabled={saving} activeOpacity={0.7}>
          {frontUrl ? (
            <Image source={{ uri: frontUrl }} style={s.idPhotoImg} resizeMode="cover" />
          ) : (
            <>
              <Text style={s.idPhotoIcon}>📷</Text>
              <Text style={s.idPhotoLabel}>{t('worker.id_front')}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[s.idPhotoZone, !!backUrl && s.idPhotoZoneDone]} onPress={() => handlePickId('back')} disabled={saving} activeOpacity={0.7}>
          {backUrl ? (
            <Image source={{ uri: backUrl }} style={s.idPhotoImg} resizeMode="cover" />
          ) : (
            <>
              <Text style={s.idPhotoIcon}>📷</Text>
              <Text style={s.idPhotoLabel}>{t('worker.id_back')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {saving && <ActivityIndicator color="#0669F7" style={{ marginTop: 8 }} />}
    </View>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.fieldLabel}>{label}</Text>;
}

function SaveBtn({ saving, onPress, label }: { saving: boolean; onPress: () => void; label?: string }) {
  const { t } = useTranslation();
  const btnLabel = label ?? t('common.save');
  return (
    <TouchableOpacity
      style={[s.saveBtn, saving && { opacity: 0.5 }]}
      onPress={onPress} disabled={saving} activeOpacity={0.8}
    >
      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>{btnLabel}</Text>}
    </TouchableOpacity>
  );
}

// ── Completion bar ────────────────────────────────────────────────────────────

function CompletionBar({ profile }: { profile: WorkerProfile }) {
  const { t } = useTranslation();
  const checks = [
    !!profile.full_name, !!profile.date_of_birth, !!profile.gender,
    !!profile.bank_name, !!profile.id_front_url, !!profile.signature_url,
  ];
  const done = checks.filter(Boolean).length;
  const pct = Math.round((done / checks.length) * 100);
  const barColor = '#0669F7';
  return (
    <View style={s.completionWrap}>
      <View style={s.completionRow}>
        <Text style={s.completionLabel}>{t('worker.profile_completion')}</Text>
        <Text style={[s.completionPct, { color: barColor }]}>{pct}%</Text>
      </View>
      <View style={s.completionTrack}>
        <View style={[s.completionFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={s.completionSub}>{t('worker.completion_items', { done, total: checks.length })}</Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WorkerProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isManager } = useAuthStore();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<Section>('basic');
  const [langModalVisible, setLangModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<WorkerProfile>('/workers/me');
      setProfile(data);
    } catch {
      setProfile({
        full_name: null, date_of_birth: null, gender: null, bio: null,
        primary_trade_id: null, trade_name_ko: null, experience_months: 0,
        current_province: null, current_district: null,
        id_number: null, id_verified: false, id_front_url: null, id_back_url: null,
        signature_url: null, bank_name: null, bank_account_number: null, bank_book_url: null,
        profile_image_url: null, phone: null, email: null,
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(partial: Partial<WorkerProfile>) {
    setProfile(prev => prev ? { ...prev, ...partial } : prev);
  }

  function toggleSection(section: Section) {
    setOpenSection(prev => prev === section ? null : section);
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#0669F7" /></View>;
  }

  const p = profile!;
  const basicDone = !!(p.full_name && p.gender);
  const bankDone = !!(p.bank_name && p.bank_account_number);
  const idDone = !!(p.id_front_url && p.id_back_url);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => toggleSection('basic')} activeOpacity={0.8}>
            <View style={s.avatarWrap}>
              {p.profile_image_url ? (
                <Image source={{ uri: p.profile_image_url }} style={s.headerAvatar} />
              ) : (
                <View style={s.headerAvatarPlaceholder}>
                  <Text style={{ fontSize: 32 }}>👤</Text>
                </View>
              )}
              <View style={s.avatarEditBadge}><Text style={{ fontSize: 12 }}>✏️</Text></View>
            </View>
          </TouchableOpacity>
          <View style={s.nameRow}>
            <Text style={s.headerName}>{p.full_name ?? t('worker.name_unregistered')}</Text>
            <TouchableOpacity onPress={() => router.push('/(worker)/settings' as never)} activeOpacity={0.7}>
              <Text style={s.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
          {p.phone && <Text style={s.headerPhone}>{formatPhone(p.phone)}</Text>}
          <View style={{ marginTop: 12, width: '100%' }}>
            <CompletionBar profile={p} />
          </View>
        </View>

        {/* Basic Info */}
        <View style={sec.card}>
          <SectionHeader
            title={t('worker.section_basic')}
            icon="👤"
            isOpen={openSection === 'basic'}
            onToggle={() => toggleSection('basic')}
            badge={basicDone ? t('worker.badge_done') : t('worker.badge_incomplete')}
            badgeDone={basicDone}
          />
          {openSection === 'basic' && <BasicSection profile={p} onSaved={handleSaved} />}
        </View>

        {/* Bank */}
        <View style={sec.card}>
          <SectionHeader
            title={t('worker.section_bank')}
            icon="🏦"
            isOpen={openSection === 'bank'}
            onToggle={() => toggleSection('bank')}
            badge={bankDone ? t('worker.badge_done') : t('worker.badge_unregistered')}
            badgeDone={bankDone}
          />
          {openSection === 'bank' && <BankSection profile={p} onSaved={handleSaved} />}
        </View>

        {/* ID */}
        <View style={sec.card}>
          <SectionHeader
            title={t('worker.section_id')}
            icon="🪪"
            isOpen={openSection === 'id'}
            onToggle={() => toggleSection('id')}
            badge={p.id_verified ? t('worker.badge_verified') : idDone ? t('worker.badge_in_review') : t('worker.badge_unregistered')}
            badgeDone={p.id_verified}
          />
          {openSection === 'id' && <IdSection profile={p} onSaved={handleSaved} />}
        </View>

        {/* Signature - navigate to existing signature screen */}
        <TouchableOpacity
          style={[sec.card, { paddingVertical: 4 }]}
          onPress={() => router.push('/(worker)/work')}
          activeOpacity={0.7}
        >
          <View style={sec.header}>
            <View style={sec.headerLeft}>
              <Text style={sec.icon}>✍️</Text>
              <Text style={sec.title}>{t('worker.section_signature')}</Text>
              {p.signature_url && (
                <View style={sec.badge}><Text style={sec.badgeText}>{t('worker.badge_registered')}</Text></View>
              )}
            </View>
            <Text style={sec.arrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Settings rows */}
        <View style={sec.card}>
          {[
            { label: t('profile.push_notifications'), icon: '🔔', onPress: undefined },
            { label: t('profile.terms'), icon: '📄', onPress: undefined },
            { label: t('profile.privacy'), icon: '🔒', onPress: undefined },
          ].map((item, i) => (
            <TouchableOpacity key={item.label} style={[sec.header, i > 0 && { borderTopWidth: 0.5, borderColor: '#F2F4F5' }]} activeOpacity={0.7}>
              <View style={sec.headerLeft}>
                <Text style={sec.icon}>{item.icon}</Text>
                <Text style={sec.title}>{item.label}</Text>
              </View>
              <Text style={sec.arrow}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[sec.header, { borderTopWidth: 0.5, borderColor: '#F2F4F5' }]}
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={sec.headerLeft}>
              <Text style={sec.icon}>🌐</Text>
              <Text style={sec.title}>{t('profile.language')}</Text>
            </View>
            <Text style={[sec.arrow, { fontSize: 12, color: '#98A2B2' }]}>
              {SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.flag ?? '🌐'} ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language selection modal */}
        <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setLangModalVisible(false)}>
            <View style={s.modalSheet}>
              <Text style={s.modalTitle}>{t('profile.language')}</Text>
              {SUPPORTED_LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[s.langOption, i18n.language === lang.code && s.langOptionActive]}
                  onPress={async () => {
                    await changeAppLanguage(lang.code as LangCode);
                    setLangModalVisible(false);
                  }}
                >
                  <Text style={s.langFlag}>{lang.flag}</Text>
                  <Text style={[s.langLabel, i18n.language === lang.code && s.langLabelActive]}>{lang.label}</Text>
                  {i18n.language === lang.code && <Text style={s.langCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {isManager && (
          <TouchableOpacity
            style={s.managerSwitchBtn}
            onPress={() => router.navigate('/(manager)/' as never)}
            activeOpacity={0.8}
          >
            <Text style={s.managerSwitchText}>{t('worker.switch_to_manager')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sec = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  icon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '600', color: '#25282A' },
  arrow: { fontSize: 14, color: '#C0C4CF' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#F2F4F5', borderWidth: 1, borderColor: '#E5E7EB' },
  badgeDone: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  badgeWarn: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  badgeTextDone: { color: '#16A34A' },
  badgeTextWarn: { color: '#92400E' },
  body: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 0.5, borderColor: '#F2F4F5' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingTop: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', padding: 24, marginBottom: 12 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  headerAvatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: '#0669F7' },
  headerAvatarPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#EFF5FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#BFDBFE' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#0669F7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  headerName: { fontSize: 20, fontWeight: '800', color: '#25282A' },
  settingsIcon: { fontSize: 20, opacity: 0.7 },
  headerPhone: { fontSize: 13, color: '#98A2B2' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#98A2B2', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#EFF1F5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#25282A' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: '#EFF1F5', alignItems: 'center' },
  genderBtnActive: { borderColor: '#0669F7', backgroundColor: '#EFF5FF' },
  genderText: { fontSize: 13, fontWeight: '600', color: '#98A2B2' },
  genderTextActive: { color: '#0669F7' },
  saveBtn: { marginTop: 16, backgroundColor: '#0669F7', borderRadius: 50, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  photoZone: { height: 120, borderRadius: 12, borderWidth: 1.5, borderColor: '#EFF1F5', borderStyle: 'dashed', backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoZoneImg: { width: '100%', height: '100%' },
  photoZonePlaceholder: { fontSize: 14, color: '#98A2B2' },
  idPhotoRow: { flexDirection: 'row', gap: 10 },
  idPhotoZone: { flex: 1, height: 110, borderRadius: 12, borderWidth: 1.5, borderColor: '#EFF1F5', borderStyle: 'dashed', backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  idPhotoZoneDone: { borderColor: '#86EFAC', borderStyle: 'solid', backgroundColor: '#F0FDF4' },
  idPhotoImg: { width: '100%', height: '100%' },
  idPhotoIcon: { fontSize: 22, marginBottom: 4 },
  idPhotoLabel: { fontSize: 12, color: '#98A2B2', fontWeight: '600' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF5FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { fontSize: 28 },
  avatarCta: { fontSize: 13, fontWeight: '700', color: '#0669F7' },
  verifiedBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 12, alignSelf: 'flex-start' },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  completionWrap: { gap: 4 },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionLabel: { fontSize: 12, color: '#98A2B2', fontWeight: '500' },
  completionPct: { fontSize: 14, fontWeight: '800' },
  completionTrack: { height: 8, backgroundColor: '#F2F4F5', borderRadius: 4, overflow: 'hidden' },
  completionFill: { height: '100%', borderRadius: 4 },
  completionSub: { fontSize: 11, color: '#C0C4CF' },
  managerSwitchBtn: { marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: '#0669F7', alignItems: 'center' },
  managerSwitchText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#25282A', marginBottom: 16, textAlign: 'center' },
  langOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F9FAFB' },
  langOptionActive: { backgroundColor: '#EFF5FF', borderWidth: 1.5, borderColor: '#0669F7' },
  langFlag: { fontSize: 22, marginRight: 12 },
  langLabel: { fontSize: 15, fontWeight: '600', color: '#25282A', flex: 1 },
  langLabelActive: { color: '#0669F7' },
  langCheck: { fontSize: 16, color: '#0669F7', fontWeight: '700' },
});
