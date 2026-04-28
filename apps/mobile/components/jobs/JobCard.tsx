import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { JobWithSite } from '@gada-vn/core';
import { Colors, Font, Radius } from '../../constants/theme';

interface Props {
  job: JobWithSite;
}

export default function JobCard({ job }: Props) {
  const router = useRouter();

  const isFull = job.slotsFilled >= job.slotsTotal;
  const coverImage = job.imageS3Keys?.[job.coverImageIdx ?? 0];
  const workDate = job.workDate
    ? new Date(job.workDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : '';

  // Status config matching web app
  const status = isFull
    ? { label: '마감', bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant, dot: Colors.disabled }
    : { label: '모집 중', bg: '#E8FBE8', text: '#1A6B1A', dot: Colors.success };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(worker)/jobs/[id]', params: { id: job.id } })}
      activeOpacity={0.85}
    >
      {/* Square cover image */}
      <View style={styles.imageWrap}>
        {coverImage ? (
          <Image
            source={{ uri: `${process.env.EXPO_PUBLIC_CDN_URL}/${coverImage}` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={{ fontSize: 28 }}>🏗️</Text>
          </View>
        )}
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      {/* Card body */}
      <View style={styles.body}>
        {/* Site / title */}
        <Text style={styles.title} numberOfLines={2}>{job.site?.name ?? job.title}</Text>

        {/* Address */}
        {(job.site?.address) ? (
          <Text style={styles.address} numberOfLines={1}>{job.site.address}</Text>
        ) : null}

        {/* Wage */}
        <Text style={styles.wage}>₫{job.dailyWage.toLocaleString()}</Text>

        {/* Date + Slots */}
        <View style={styles.footer}>
          {workDate ? <Text style={styles.footerText}>📅 {workDate}</Text> : null}
          <Text style={styles.footerText}>👷 {job.slotsFilled}/{job.slotsTotal}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: Colors.surfaceContainer,
    position: 'relative',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF1F6',
  },
  statusBadge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  body: { padding: 10, gap: 3 },
  title: { ...Font.t4, color: Colors.onSurface, lineHeight: 18 },
  address: { fontSize: 11, color: Colors.onSurfaceVariant, lineHeight: 15 },
  wage: { fontSize: 15, fontWeight: '800', color: Colors.brand, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  footerText: { fontSize: 10, color: Colors.onSurfaceVariant },
});
