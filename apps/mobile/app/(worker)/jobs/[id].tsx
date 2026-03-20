import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { JobWithSite } from '@gada-vn/core';
import { api, ApiError } from '../../../lib/api-client';

const CDN = process.env.EXPO_PUBLIC_CDN_URL ?? '';

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
  const [job, setJob] = useState<JobWithSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<JobWithSite>(`/jobs/${id}`);
      setJob(data);
    } catch {
      Alert.alert('오류', '일자리 정보를 불러올 수 없습니다.', [
        { text: '확인', onPress: () => router.back() },
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
      Alert.alert('지원 완료 ✅', '일자리에 성공적으로 지원했습니다.\n결과는 알림으로 안내드립니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError && err.statusCode === 409
          ? '이미 지원한 일자리입니다.'
          : '지원에 실패했습니다. 다시 시도해 주세요.';
      Alert.alert('오류', message);
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
  const coverKey = job.imageS3Keys?.[job.coverImageIdx ?? 0];
  const workDateLabel = new Date(job.workDate).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
  const timeLabel =
    job.startTime && job.endTime ? `${job.startTime} ~ ${job.endTime}` : '시간 미정';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Cover image */}
        {coverKey ? (
          <Image
            source={{ uri: `${CDN}/${coverKey}` }}
            style={styles.cover}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText}>🏗️</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.siteName}>{job.site?.name ?? job.title}</Text>
          <Text style={styles.address}>{job.site?.address}</Text>
          {job.distanceKm !== undefined && (
            <Text style={styles.distanceBadge}>📍 내 위치에서 {job.distanceKm.toFixed(1)}km</Text>
          )}
        </View>

        {/* Wage highlight */}
        <View style={styles.wageCard}>
          <Text style={styles.wageLabel}>일당</Text>
          <Text style={styles.wage}>₫{job.dailyWage.toLocaleString()}</Text>
          <View style={[styles.slotBadge, isFull && styles.slotBadgeFull]}>
            <Text style={styles.slotBadgeText}>
              {isFull ? '마감' : `${job.slotsTotal - job.slotsFilled}자리 남음`}
            </Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>근무 정보</Text>
          <InfoRow icon="📅" label="근무일" value={workDateLabel} />
          <InfoRow icon="⏰" label="근무 시간" value={timeLabel} />
          <InfoRow icon="👷" label="모집 인원" value={`${job.slotsTotal}명 (현재 ${job.slotsFilled}명)`} />
        </View>

        {/* Benefits */}
        {Object.keys(job.benefits ?? {}).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제공 혜택</Text>
            <View style={styles.tagRow}>
              {job.benefits?.meals && <BenefitTag label="🍱 식사 제공" />}
              {job.benefits?.transport && <BenefitTag label="🚌 교통 지원" />}
              {job.benefits?.accommodation && <BenefitTag label="🏠 숙소 제공" />}
              {job.benefits?.insurance && <BenefitTag label="🛡️ 보험 적용" />}
            </View>
          </View>
        )}

        {/* Description */}
        {job.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>상세 내용</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        )}

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Apply CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.applyBtn, (isFull || applying) && styles.applyBtnDisabled]}
          onPress={() => setConfirmVisible(true)}
          disabled={isFull || applying}
        >
          {applying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.applyBtnText}>
              {isFull ? '마감된 일자리입니다' : '지원하기'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirm modal */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>지원 확인</Text>
            <Text style={styles.modalBody}>
              <Text style={{ fontWeight: '700' }}>{job.site?.name ?? job.title}</Text>
              {'\n'}({workDateLabel}){'\n\n'}위 일자리에 지원하시겠습니까?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleApply}>
                <Text style={styles.confirmBtnText}>지원하기</Text>
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
  content: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  cover: { width: '100%', height: 220 },
  coverPlaceholder: { backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center' },
  coverPlaceholderText: { fontSize: 64 },

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
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
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
