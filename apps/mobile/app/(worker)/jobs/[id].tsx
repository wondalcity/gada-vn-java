import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Platform, Dimensions, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../../lib/api-client';
import { Colors, Font, Spacing, Radius } from '../../../constants/theme';
import { showToast } from '../../../lib/toast';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface JobDetail {
  id: string;
  title: string;
  titleKo?: string;
  titleVi?: string;
  description: string | null;
  tradeId: number | null;
  tradeNameKo?: string | null;
  tradeNameVi?: string | null;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
  dailyWage: number;
  // benefits stored as JSONB object {meals: true, transport: true, ...}
  benefits?: {
    meals?: boolean;
    transport?: boolean;
    accommodation?: boolean;
    insurance?: boolean;
  } | null;
  // requirements stored as JSONB {minExperienceMonths: 6, notes: '...'}
  requirements?: {
    minExperienceMonths?: number;
    min_experience_months?: number;
    notes?: string;
  } | null;
  slotsTotal: number;
  slotsFilled: number;
  status: string;
  // Site image fields — resolved CDN URLs (present when CLOUDFRONT_DOMAIN is set on server)
  siteImageUrls?: string[];
  siteCoverImageUrl?: string | null;
  // Raw S3 keys — always present; used as client-side CDN fallback
  imageS3Keys?: string[];
  coverImageIdx?: number;
  // Flat site fields
  siteName?: string | null;
  siteNameKo?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  siteType?: string | null;
  lat?: number | null;
  lng?: number | null;
  distanceKm?: number;
}

function formatMinExp(months: number): string {
  if (months === 0) return '경력 무관';
  if (months < 12) return `최소 ${months}개월`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `최소 ${years}년`;
  return `최소 ${years}년 ${rem}개월`;
}

function openInMaps(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  const url = Platform.OS === 'ios'
    ? `maps://?ll=${lat},${lng}&q=${label}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url);
}

function ImageCarousel({ imageUrls }: { imageUrls: string[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  if (imageUrls.length === 0) {
    return (
      <View style={[styles.cover, styles.coverPlaceholder]}>
        <Text style={styles.coverPlaceholderText}>🏗️</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIdx(idx);
        }}
        style={{ width: SCREEN_WIDTH, height: 240 }}
      >
        {imageUrls.map((url, i) => (
          <Image
            key={i}
            source={{ uri: url }}
            style={{ width: SCREEN_WIDTH, height: 240 }}
            contentFit="cover"
            transition={250}
          />
        ))}
      </ScrollView>
      {/* Counter badge */}
      {imageUrls.length > 1 && (
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{activeIdx + 1}/{imageUrls.length}</Text>
        </View>
      )}
      {/* Dot indicators */}
      {imageUrls.length > 1 && (
        <View style={styles.dotRow}>
          {imageUrls.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIdx && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` as any }]} />
    </View>
  );
}

function BenefitRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIconWrap}>
        <Text style={styles.benefitIcon}>{icon}</Text>
      </View>
      <Text style={styles.benefitLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<JobDetail>(`/jobs/${id}`);
      setJob(data);
    } catch {
      showToast({ message: t('jobs.load_fail', '일자리 정보를 불러오지 못했습니다'), type: 'error' });
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleApply() {
    setConfirmVisible(false);
    setApplying(true);
    try {
      await api.post(`/jobs/${id}/apply`);
      showToast({ message: t('jobs.apply_success_body', '지원이 완료되었습니다'), type: 'success' });
      router.back();
    } catch (err) {
      const message =
        err instanceof ApiError && err.statusCode === 409
          ? t('jobs.already_applied', '이미 지원한 공고입니다')
          : t('jobs.apply_fail', '지원에 실패했습니다');
      showToast({ message, type: 'error' });
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!job) return null;

  const isFull = job.status === 'FILLED' || job.slotsFilled >= job.slotsTotal;
  const remaining = job.slotsTotal - job.slotsFilled;

  const displayTitle = i18n.language === 'vi'
    ? (job.titleVi || job.titleKo || job.title || '')
    : (job.titleKo || job.title || '');

  const displaySiteName = job.siteNameKo || job.siteName || '';
  const displayAddress = job.address || '';
  const displayProvince = job.province || '';

  const displayTrade = i18n.language === 'vi'
    ? (job.tradeNameVi || job.tradeNameKo || null)
    : (job.tradeNameKo || null);

  const workDateLabel = (() => {
    const d = new Date(job.workDate);
    const locale = i18n.language === 'vi' ? 'vi-VN' : i18n.language === 'en' ? 'en-US' : 'ko-KR';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  })();

  const workDateShort = (() => {
    const d = new Date(job.workDate);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  })();

  const timeLabel =
    job.startTime && job.endTime ? `${job.startTime} ~ ${job.endTime}` : t('jobs.time_tbd');

  // Benefits — JSONB object {meals: true, transport: false, ...}
  type BenefitKey = 'meals' | 'transport' | 'accommodation' | 'insurance';
  const BENEFIT_META: Record<BenefitKey, { icon: string; label: string }> = {
    meals:         { icon: '🍱', label: t('jobs.benefit_meals') },
    transport:     { icon: '🚌', label: t('jobs.benefit_transport') },
    accommodation: { icon: '🏠', label: t('jobs.benefit_accommodation') },
    insurance:     { icon: '🛡️', label: t('jobs.benefit_insurance') },
  };
  const activeBenefits = (Object.entries(job.benefits ?? {}) as [BenefitKey, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => BENEFIT_META[k])
    .filter(Boolean);

  // Requirements
  const minExpMonths = job.requirements?.minExperienceMonths
    ?? (job.requirements as any)?.min_experience_months
    ?? null;
  const reqNotes = job.requirements?.notes ?? null;

  // Images — prefer server-resolved CDN URLs, fall back to client-side construction
  const CDN_URL = process.env.EXPO_PUBLIC_CDN_URL ?? '';
  const imageUrls = (() => {
    if ((job.siteImageUrls ?? []).length > 0) return job.siteImageUrls!;
    if (job.siteCoverImageUrl) return [job.siteCoverImageUrl];
    if ((job.imageS3Keys ?? []).length > 0) {
      return job.imageS3Keys!.map(key => `${CDN_URL}/${key}`);
    }
    return [];
  })();

  // Site initials for avatar
  const siteInitials = displaySiteName
    ? displaySiteName.charAt(0).toUpperCase()
    : '🏗';

  const bottomBarHeight = 80 + insets.bottom;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: bottomBarHeight + 16 }}
      >
        {/* ── Image carousel ── */}
        <ImageCarousel imageUrls={imageUrls} />

        {/* ── Title + Site header ── */}
        <View style={styles.section}>
          <View style={[styles.statusBadge, isFull && styles.statusBadgeFull]}>
            <View style={[styles.statusDot, { backgroundColor: isFull ? Colors.disabled : Colors.success }]} />
            <Text style={[styles.statusText, isFull && styles.statusTextFull]}>
              {isFull ? t('jobs.closed_label') : t('jobs.status_open_label')}
            </Text>
          </View>

          <Text style={styles.jobTitle} numberOfLines={3}>{displayTitle}</Text>
          {displaySiteName ? (
            <Text style={styles.siteName}>🏗️ {displaySiteName}</Text>
          ) : null}
          {(displayAddress || displayProvince) ? (
            <Text style={styles.address}>📍 {[displayAddress, displayProvince].filter(Boolean).join(', ')}</Text>
          ) : null}
          {job.distanceKm !== undefined && (
            <Text style={styles.distanceBadge}>
              {t('jobs.distance_from_me', { km: job.distanceKm.toFixed(1) })}
            </Text>
          )}
        </View>

        {/* ── Wage card ── */}
        <View style={styles.wageCard}>
          <View style={styles.wageInfo}>
            <Text style={styles.wageLabel}>{t('jobs.wage_label')}</Text>
            <Text style={styles.wage}>₫{new Intl.NumberFormat('ko-KR').format(job.dailyWage)}</Text>
          </View>
          <View style={styles.wageDivider} />
          <View style={styles.wageInfo}>
            <Text style={styles.wageLabel}>{workDateShort}</Text>
            <Text style={styles.wageDateText}>{t('jobs.info_work_date')}</Text>
          </View>
        </View>

        {/* ── Positions with progress bar ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('jobs.info_headcount')}</Text>
          <View style={styles.positionsRow}>
            <Text style={styles.positionsFilled}>{job.slotsFilled}</Text>
            <Text style={styles.positionsOf}>/{job.slotsTotal}명</Text>
            {!isFull && remaining > 0 && (
              <View style={styles.remainingBadge}>
                <Text style={styles.remainingText}>{t('jobs.slots_remaining', { count: remaining })}</Text>
              </View>
            )}
            {isFull && (
              <View style={[styles.remainingBadge, styles.remainingBadgeFull]}>
                <Text style={[styles.remainingText, styles.remainingTextFull]}>{t('jobs.closed_label')}</Text>
              </View>
            )}
          </View>
          <ProgressBar value={job.slotsFilled} total={job.slotsTotal} />
          <Text style={styles.progressHint}>
            {job.slotsFilled}명 지원 / {job.slotsTotal}명 모집
          </Text>
        </View>

        {/* ── Work info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('jobs.section_work_info')}</Text>
          <InfoRow icon="📅" label={t('jobs.info_work_date')} value={workDateLabel} />
          <InfoRow icon="⏰" label={t('jobs.info_work_time')} value={timeLabel} />
          {displayTrade && (
            <InfoRow icon="🔧" label={t('jobs.info_trade')} value={displayTrade} />
          )}
          {job.siteType && (
            <InfoRow icon="🏢" label={t('jobs.info_site_type')} value={job.siteType} />
          )}
        </View>

        {/* ── Benefits ── */}
        {activeBenefits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.section_benefits')}</Text>
            {activeBenefits.map((b, i) => (
              <BenefitRow key={i} icon={b.icon} label={b.label} />
            ))}
          </View>
        )}

        {/* ── Requirements ── */}
        {(minExpMonths != null || reqNotes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.requirements')}</Text>
            {minExpMonths != null && (
              <InfoRow icon="🎖️" label="최소 경력" value={formatMinExp(minExpMonths)} />
            )}
            {reqNotes ? (
              <Text style={[styles.description, { marginTop: 8 }]}>{reqNotes}</Text>
            ) : null}
          </View>
        )}

        {/* ── Description ── */}
        {job.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.section_description')}</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        ) : null}

        {/* ── Work Site card ── */}
        {(displaySiteName || displayAddress) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.section_site_info')}</Text>
            <View style={styles.siteCard}>
              {/* Site avatar */}
              <View style={styles.siteAvatar}>
                <Text style={styles.siteAvatarText}>{siteInitials}</Text>
              </View>
              <View style={styles.siteCardInfo}>
                {displaySiteName ? (
                  <Text style={styles.siteCardName} numberOfLines={1}>{displaySiteName}</Text>
                ) : null}
                {(displayAddress || displayProvince) ? (
                  <Text style={styles.siteCardAddress} numberOfLines={2}>
                    {[displayAddress, displayProvince].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
              </View>
            </View>
            {job.lat != null && job.lng != null && (
              <TouchableOpacity
                style={styles.mapLinkBtn}
                onPress={() => openInMaps(job.lat!, job.lng!, displaySiteName || displayAddress)}
                activeOpacity={0.75}
              >
                <Text style={styles.mapLinkText}>🗺  지도에서 보기 →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.bottomBarLeft}>
          <Text style={styles.bottomWageLabel}>{t('jobs.wage_label')}</Text>
          <Text style={styles.bottomWage}>₫{new Intl.NumberFormat('ko-KR').format(job.dailyWage)}</Text>
          <Text style={styles.bottomDate}>{workDateShort}</Text>
        </View>
        <TouchableOpacity
          style={[styles.applyBtn, (isFull || applying) && styles.applyBtnDisabled]}
          onPress={() => setConfirmVisible(true)}
          disabled={isFull || applying}
          activeOpacity={0.85}
        >
          {applying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.applyBtnText}>
              {isFull ? t('jobs.closed_label') : t('jobs.apply_button')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Confirm modal ── */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('jobs.apply_confirm_title')}</Text>
            <Text style={styles.modalBody}>
              <Text style={{ fontWeight: '700' }}>{displaySiteName || displayTitle}</Text>
              {'\n'}({workDateLabel}){'\n\n'}{t('jobs.apply_confirm_body')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleApply}>
                <Text style={styles.confirmBtnText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Cover / carousel
  cover: { width: '100%', height: 240 },
  coverPlaceholder: { backgroundColor: Colors.surfaceContainer, justifyContent: 'center', alignItems: 'center' },
  coverPlaceholderText: { fontSize: 64 },
  counterBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dotRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: 10, backgroundColor: Colors.surface,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.outline },
  dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: Colors.primary },

  // Section card
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: Radius.lg, padding: 16,
  },
  sectionTitle: {
    ...Font.t4,
    color: Colors.onSurface,
    marginBottom: 14,
  },

  // Title + site header
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E8FBE8', borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  statusBadgeFull: { backgroundColor: Colors.surfaceContainer },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#1A6B1A' },
  statusTextFull: { color: Colors.onSurfaceVariant },
  jobTitle: {
    fontSize: 20, fontWeight: '800', color: Colors.onSurface,
    lineHeight: 28, marginBottom: 8,
  },
  siteName: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 4 },
  address: { fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 18, marginBottom: 4 },
  distanceBadge: { fontSize: 12, fontWeight: '600', color: Colors.primary, marginTop: 4 },

  // Wage card
  wageCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.lg,
    marginHorizontal: 16, marginTop: 12,
    padding: 16, alignItems: 'center',
  },
  wageInfo: { flex: 1, alignItems: 'center' },
  wageDivider: { width: 1, height: 40, backgroundColor: 'rgba(6,105,247,0.2)' },
  wageLabel: { fontSize: 11, color: Colors.onSurfaceVariant, marginBottom: 4 },
  wage: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  wageDateText: { fontSize: 14, fontWeight: '600', color: Colors.onSurface, marginTop: 2 },

  // Positions
  positionsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 },
  positionsFilled: { fontSize: 24, fontWeight: '900', color: Colors.onSurface },
  positionsOf: { fontSize: 16, color: Colors.onSurfaceVariant },
  remainingBadge: {
    marginLeft: 8, backgroundColor: Colors.successContainer,
    borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'center',
  },
  remainingBadgeFull: { backgroundColor: Colors.surfaceContainer },
  remainingText: { fontSize: 11, fontWeight: '700', color: Colors.onSuccessContainer },
  remainingTextFull: { color: Colors.onSurfaceVariant },
  progressBg: {
    height: 8, borderRadius: 4, backgroundColor: Colors.outline, overflow: 'hidden',
  },
  progressFill: {
    height: 8, borderRadius: 4, backgroundColor: Colors.primary,
  },
  progressHint: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 6 },

  // Info rows
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  infoIcon: { fontSize: 16 },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: Colors.onSurfaceVariant, marginBottom: 2 },
  infoValue: { fontSize: 14, color: Colors.onSurface, fontWeight: '500', lineHeight: 19 },

  // Benefits rows
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  benefitIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitIcon: { fontSize: 16 },
  benefitLabel: { fontSize: 14, color: Colors.onSurface, fontWeight: '500' },

  // Description
  description: { fontSize: 14, color: Colors.onSurface, lineHeight: 22 },

  // Work Site card
  siteCard: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  siteAvatar: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  siteAvatarText: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  siteCardInfo: { flex: 1 },
  siteCardName: { fontSize: 15, fontWeight: '700', color: Colors.onSurface, marginBottom: 3 },
  siteCardAddress: { fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 18 },
  mapLinkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.md,
  },
  mapLinkText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.outline,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  bottomBarLeft: { flex: 1 },
  bottomWageLabel: { fontSize: 11, color: Colors.onSurfaceVariant },
  bottomWage: { fontSize: 18, fontWeight: '900', color: Colors.primary, lineHeight: 24 },
  bottomDate: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  applyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center',
  },
  applyBtnDisabled: { backgroundColor: Colors.disabled },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Confirm modal
  overlay: {
    flex: 1, backgroundColor: Colors.overlay80,
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: Colors.surface, borderRadius: 20,
    margin: 24, padding: 24, width: '85%',
  },
  modalTitle: { ...Font.t2, color: Colors.onSurface, marginBottom: 12 },
  modalBody: { ...Font.body3, color: Colors.onSurfaceVariant, lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.outline,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.onSurfaceVariant, fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
