import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../../lib/api-client';
import { Colors, Font, Spacing, Radius } from '../../../constants/theme';

const CDN = process.env.EXPO_PUBLIC_CDN_URL ?? '';
const SCREEN_WIDTH = Dimensions.get('window').width;

// The API returns flat data (site fields are not nested under 'site')
// after camelizeKeys: site_name → siteName, s.address → address, etc.
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
  benefits: {
    meals?: boolean;
    transport?: boolean;
    accommodation?: boolean;
    insurance?: boolean;
  };
  slotsTotal: number;
  slotsFilled: number;
  status: string;
  imageS3Keys: string[];
  coverImageIdx: number;
  // Flat site fields from JOIN
  siteName?: string | null;
  siteNameKo?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  siteType?: string | null;
  lat?: number | null;
  lng?: number | null;
  siteCoverImageUrl?: string | null;
  distanceKm?: number;
}

function ImageCarousel({ imageKeys, coverIdx = 0 }: { imageKeys: string[]; coverIdx?: number }) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(coverIdx);

  useEffect(() => {
    if (coverIdx > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: coverIdx * SCREEN_WIDTH, animated: false });
      }, 100);
    }
  }, [coverIdx]);

  if (imageKeys.length === 0) {
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
        {imageKeys.map((key, i) => (
          <Image
            key={i}
            source={{ uri: `${CDN}/${key}` }}
            style={{ width: SCREEN_WIDTH, height: 240 }}
            contentFit="cover"
            transition={250}
          />
        ))}
      </ScrollView>
      {imageKeys.length > 1 && (
        <View style={styles.dotRow}>
          {imageKeys.map((_, i) => (
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

function BenefitChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
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
      Alert.alert(t('common.error'), t('jobs.load_fail'), [
        { text: t('common.confirm'), onPress: () => router.back() },
      ]);
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
      Alert.alert(t('jobs.apply_success_title'), t('jobs.apply_success_body'), [
        { text: t('common.confirm'), onPress: () => router.back() },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError && err.statusCode === 409
          ? t('jobs.already_applied')
          : t('jobs.apply_fail');
      Alert.alert(t('common.error'), message);
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

  // Language-aware title
  const displayTitle = i18n.language === 'vi'
    ? (job.titleVi || job.titleKo || job.title || '')
    : (job.titleKo || job.title || '');

  // Site display
  const displaySiteName = job.siteNameKo || job.siteName || '';
  const displayAddress = job.address || '';
  const displayProvince = job.province || '';
  const displayDistrict = job.district || '';

  // Trade name
  const displayTrade = i18n.language === 'vi'
    ? (job.tradeNameVi || job.tradeNameKo || null)
    : (job.tradeNameKo || null);

  // Work date
  const workDateLabel = (() => {
    const d = new Date(job.workDate);
    const locale = i18n.language === 'vi' ? 'vi-VN' : i18n.language === 'en' ? 'en-US' : 'ko-KR';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  })();

  const timeLabel =
    job.startTime && job.endTime ? `${job.startTime} ~ ${job.endTime}` : t('jobs.time_tbd');

  // Benefits
  const benefitLabels: string[] = [];
  if (job.benefits?.meals) benefitLabels.push(t('jobs.benefit_meals'));
  if (job.benefits?.transport) benefitLabels.push(t('jobs.benefit_transport'));
  if (job.benefits?.accommodation) benefitLabels.push(t('jobs.benefit_accommodation'));
  if (job.benefits?.insurance) benefitLabels.push(t('jobs.benefit_insurance'));

  // Cover image (from job's own images or site cover)
  const imageKeys = job.imageS3Keys ?? [];

  const bottomBarHeight = 68 + 16 + insets.bottom;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: bottomBarHeight + 16 }}
      >
        {/* Image carousel */}
        <ImageCarousel
          imageKeys={imageKeys}
          coverIdx={job.coverImageIdx ?? 0}
        />

        {/* ── Title + Site ── */}
        <View style={styles.section}>
          {/* Status badge */}
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
          {displayAddress ? (
            <Text style={styles.address}>📍 {[displayAddress, displayDistrict, displayProvince].filter(Boolean).join(', ')}</Text>
          ) : displayProvince ? (
            <Text style={styles.address}>📍 {[displayDistrict, displayProvince].filter(Boolean).join(', ')}</Text>
          ) : null}
          {job.distanceKm !== undefined && (
            <Text style={styles.distanceBadge}>
              {t('jobs.distance_from_me', { km: job.distanceKm.toFixed(1) })}
            </Text>
          )}
        </View>

        {/* ── Wage + Slots grid ── */}
        <View style={styles.wageGrid}>
          <View style={styles.wageCard}>
            <Text style={styles.wageLabel}>{t('jobs.wage_label')}</Text>
            <Text style={styles.wage}>₫{new Intl.NumberFormat('ko-KR').format(job.dailyWage)}</Text>
            <Text style={styles.wageUnit}>{t('jobs.wage_unit', '/일')}</Text>
          </View>
          <View style={styles.slotsCard}>
            <Text style={styles.wageLabel}>{t('jobs.info_headcount')}</Text>
            <Text style={styles.slotsValue}>{job.slotsFilled}<Text style={styles.slotsTotal}>/{job.slotsTotal}명</Text></Text>
            {!isFull && remaining > 0 && (
              <Text style={styles.remainingText}>{t('jobs.slots_remaining', { count: remaining })}</Text>
            )}
          </View>
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
        {benefitLabels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.section_benefits')}</Text>
            <View style={styles.chipRow}>
              {benefitLabels.map(label => (
                <BenefitChip key={label} label={label} />
              ))}
            </View>
          </View>
        )}

        {/* ── Description ── */}
        {job.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.section_description')}</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        ) : null}

        {/* ── Site info ── */}
        {(displaySiteName || displayAddress) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.section_site_info')}</Text>
            {displaySiteName ? (
              <InfoRow icon="🏗️" label={t('jobs.info_site_name')} value={displaySiteName} />
            ) : null}
            {displayAddress ? (
              <InfoRow icon="📍" label={t('jobs.info_address')} value={[displayAddress, displayDistrict, displayProvince].filter(Boolean).join(', ')} />
            ) : displayProvince ? (
              <InfoRow icon="📍" label={t('jobs.info_address')} value={[displayDistrict, displayProvince].filter(Boolean).join(', ')} />
            ) : null}
            {job.lat != null && job.lng != null && (
              <InfoRow icon="🌏" label={t('jobs.info_coords')} value={`${job.lat.toFixed(4)}, ${job.lng.toFixed(4)}`} />
            )}
          </View>
        )}
      </ScrollView>

      {/* Apply CTA */}
      <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.applyBtn, (isFull || applying) && styles.applyBtnDisabled]}
          onPress={() => setConfirmVisible(true)}
          disabled={isFull || applying}
          activeOpacity={0.85}
        >
          {applying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.applyBtnText}>
              {isFull ? t('jobs.apply_confirm_closed') : t('jobs.apply_button')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirm modal */}
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
                <Text style={styles.confirmBtnText}>{t('jobs.apply_button')}</Text>
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
  distanceBadge: {
    fontSize: 12, fontWeight: '600', color: Colors.primary,
    marginTop: 4,
  },

  // Wage + slots grid
  wageGrid: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16, marginTop: 12,
  },
  wageCard: {
    flex: 1, backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.lg, padding: 16,
  },
  slotsCard: {
    flex: 1, backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.lg, padding: 16,
  },
  wageLabel: { fontSize: 12, color: Colors.onSurfaceVariant, marginBottom: 4 },
  wage: { fontSize: 22, fontWeight: '900', color: Colors.brand },
  wageUnit: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  slotsValue: { fontSize: 22, fontWeight: '900', color: Colors.onSurface },
  slotsTotal: { fontSize: 14, fontWeight: '400', color: Colors.onSurfaceVariant },
  remainingText: { fontSize: 11, color: Colors.success, fontWeight: '600', marginTop: 4 },

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

  // Benefits chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  // Description
  description: { fontSize: 14, color: Colors.onSurface, lineHeight: 22 },

  // Bottom bar + apply button
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.outline,
  },
  applyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingVertical: 16, alignItems: 'center',
  },
  applyBtnDisabled: { backgroundColor: Colors.disabled },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

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
