import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import type { JobWithSite } from '@gada-vn/core';
import { api } from '../../lib/api-client';

interface Props {
  job: JobWithSite;
  onWagePress?: () => void;
}

export default function JobCard({ job, onWagePress }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const isFull = job.slotsFilled >= job.slotsTotal;
  const coverImage = job.imageS3Keys?.[job.coverImageIdx ?? 0];

  async function handleApply() {
    try {
      await api.post(`/jobs/${job.id}/apply`);
      Alert.alert(t('jobs.apply_success_title'), t('jobs.apply_success_short'));
    } catch (err) {
      Alert.alert(t('common.error'), t('jobs.apply_fail_short'));
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(worker)/jobs/[id]', params: { id: job.id } })}
    >
      {coverImage && (
        <Image
          source={{ uri: `${process.env.EXPO_PUBLIC_CDN_URL}/${coverImage}` }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      )}

      <View style={styles.body}>
        <Text style={styles.siteName}>{job.site?.name ?? job.title}</Text>
        <Text style={styles.address} numberOfLines={1}>{job.site?.address}</Text>

        <View style={styles.meta}>
          <TouchableOpacity onPress={onWagePress} activeOpacity={onWagePress ? 0.65 : 1} disabled={!onWagePress}>
            <Text style={styles.wage}>₫{job.dailyWage.toLocaleString()}</Text>
          </TouchableOpacity>
          {job.distanceKm !== undefined && (
            <Text style={styles.distance}>{t('jobs.distance', { km: job.distanceKm.toFixed(1) })}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.slots}>
            {t('jobs.slots', { filled: job.slotsFilled, total: job.slotsTotal })}
          </Text>
          <TouchableOpacity
            style={[styles.applyBtn, isFull && styles.closedBtn]}
            onPress={isFull ? undefined : handleApply}
            disabled={isFull}
          >
            <Text style={styles.applyBtnText}>
              {isFull ? t('jobs.closed_button') : t('jobs.apply_button')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  image: { width: '100%', height: 160 },
  body: { padding: 16 },
  siteName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  address: { fontSize: 13, color: '#888', marginBottom: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  wage: { fontSize: 18, fontWeight: '800', color: '#FF6B2C' },
  distance: { fontSize: 13, color: '#666', alignSelf: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slots: { fontSize: 13, color: '#888' },
  applyBtn: { backgroundColor: '#FF6B2C', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  closedBtn: { backgroundColor: '#ccc' },
  applyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
