import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { JobWithSite } from '@gada-vn/core';
import { api, ApiError } from '../../../lib/api-client';

const CDN = process.env.EXPO_PUBLIC_CDN_URL ?? '';
const SCREEN_WIDTH = Dimensions.get('window').width;

function ImageCarousel({ imageKeys, coverIdx = 0 }: { imageKeys: string[]; coverIdx?: number }) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(coverIdx);

  // Scroll to cover image on mount
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
        style={{ width: SCREEN_WIDTH, height: 220 }}
      >
        {imageKeys.map((key, i) => (
          <Image
            key={i}
            source={{ uri: `${CDN}/${key}` }}
            style={{ width: SCREEN_WIDTH, height: 220 }}
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

function BenefitTag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<JobWithSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<JobWithSite>(`/jobs/${id}`);
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
        <ActivityIndicator size="large" color="#FF6B2C" />
      </View>
    );
  }

  if (!job) return null;

  const isFull = job.slotsFilled >= job.slotsTotal;
  const workDateLabel = new Date(job.workDate).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
  const timeLabel =
    job.startTime && job.endTime ? `${job.startTime} ~ ${job.endTime}` : t('jobs.time_tbd');

  // Bottom bar height: button (16+20+16) + padding (16) + safe area bottom
  const bottomBarHeight = 68 + 16 + insets.bottom;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: bottomBarHeight + 16 }]}
      >
        {/* Image carousel */}
        <ImageCarousel
          imageKeys={job.imageS3Keys ?? []}
          coverIdx={job.coverImageIdx ?? 0}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.siteName}>{job.site?.name ?? job.title}</Text>
          <Text style={styles.address}>{job.site?.address}</Text>
          {job.distanceKm !== undefined && (
            <Text style={styles.distanceBadge}>{t('jobs.distance_from_me', { km: job.distanceKm.toFixed(1) })}</Text>
          )}
        </View>

        {/* Wage highlight */}
        <View style={styles.wageCard}>
          <Text style={styles.wageLabel}>{t('jobs.wage_label')}</Text>
          <Text style={styles.wage}>₫{new Intl.NumberFormat('ko-KR').format(job.dailyWage)}</Text>
          <View style={[styles.slotBadge, isFull && styles.slotBadgeFull]}>
            <Text style={styles.slotBadgeText}>
              {isFull ? t('jobs.closed_label') : t('jobs.slots_remaining', { count: job.slotsTotal - job.slotsFilled })}
            </Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('jobs.section_work_info')}</Text>
          <InfoRow icon="📅" label={t('jobs.info_work_date')} value={workDateLabel} />
          <InfoRow icon="⏰" label={t('jobs.info_work_time')} value={timeLabel} />
          <InfoRow icon="👷" label={t('jobs.info_headcount')} value={t('jobs.info_headcount_value', { total: job.slotsTotal, filled: job.slotsFilled })} />
        </View>

        {/* Benefits */}
        {Object.keys(job.benefits ?? {}).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.section_benefits')}</Text>
            <View style={styles.tagRow}>
              {job.benefits?.meals && <BenefitTag label={t('jobs.benefit_meals')} />}
              {job.benefits?.transport && <BenefitTag label={t('jobs.benefit_transport')} />}
              {job.benefits?.accommodation && <BenefitTag label={t('jobs.benefit_accommodation')} />}
              {job.benefits?.insurance && <BenefitTag label={t('jobs.benefit_insurance')} />}
            </View>
          </View>
        )}

        {/* Description */}
        {job.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs.section_description')}</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        )}

      </ScrollView>

      {/* Apply CTA */}
      <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.applyBtn, (isFull || applying) && styles.applyBtnDisabled]}
          onPress={() => setConfirmVisible(true)}
          disabled={isFull || applying}
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
              <Text style={{ fontWeight: '700' }}>{job.site?.name ?? job.title}</Text>
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: {},
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  cover: { width: '100%', height: 220 },
  coverPlaceholder: { backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center' },
  coverPlaceholderText: { fontSize: 64 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#fff' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D0D4DB' },
  dotActive: { width: 18, backgroundColor: '#FF6B2C' },

  header: { backgroundColor: '#fff', padding: 20, marginBottom: 8 },
  siteName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  address: { fontSize: 14, color: '#888', marginBottom: 6 },
  distanceBadge: { fontSize: 13, color: '#FF6B2C', fontWeight: '600' },

  wageCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  wageLabel: { fontSize: 14, color: '#888' },
  wage: { flex: 1, fontSize: 26, fontWeight: '800', color: '#FF6B2C' },
  slotBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  slotBadgeFull: { backgroundColor: '#FFEBEE' },
  slotBadgeText: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },

  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },

  infoRow: { flexDirection: 'row', gap: 14, marginBottom: 14, alignItems: 'flex-start' },
  infoIcon: { fontSize: 22, width: 28 },
  infoLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#FFF3EE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: '#FF6B2C', fontSize: 13, fontWeight: '600' },

  description: { fontSize: 14, color: '#555', lineHeight: 22 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  applyBtn: {
    backgroundColor: '#FF6B2C', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  applyBtnDisabled: { backgroundColor: '#ccc' },
  applyBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 20,
    margin: 24, padding: 24, width: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  modalBody: { fontSize: 15, color: '#555', lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#555', fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    flex: 1, backgroundColor: '#FF6B2C',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
