import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, Platform,
} from 'react-native';
import MapView, { Marker, Region, MapPressEvent } from 'react-native-maps';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { JobWithSite } from '@gada-vn/core';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Airbnb-style zoom level delta when selecting a job
const SELECTED_DELTA = 0.012; // ~1.2km per side ≈ zoom 14-15

function formatVnd(n: number): string {
  if (n >= 1_000_000) return `₫${(n / 1_000_000).toFixed(1)}M`;
  return `₫${(n / 1000).toFixed(0)}K`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${['일','월','화','수','목','금','토'][d.getDay()]})`;
}

// ── Custom wage pill marker ──────────────────────────────────────────────────

function WageMarker({ job, isSelected }: { job: JobWithSite; isSelected: boolean }) {
  return (
    <View style={[styles.markerPill, isSelected && styles.markerPillSelected]}>
      <Text style={[styles.markerText, isSelected && styles.markerTextSelected]}>
        {formatVnd(job.dailyWage)}
      </Text>
    </View>
  );
}

// ── Airbnb-style bottom job card ─────────────────────────────────────────────

function JobCard({
  job,
  onClose,
  slideAnim,
}: {
  job: JobWithSite;
  onClose: () => void;
  slideAnim: Animated.Value;
}) {
  const router = useRouter();
  const isFull = job.slotsFilled >= job.slotsTotal;
  const remaining = job.slotsTotal - job.slotsFilled;
  const coverImage = job.imageS3Keys?.[job.coverImageIdx ?? 0];

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateY: slideAnim }],
          opacity: slideAnim.interpolate({ inputRange: [0, 80], outputRange: [1, 0] }),
        },
      ]}
    >
      <View style={styles.cardInner}>
        {/* Cover image */}
        <View style={styles.cardImage}>
          {coverImage ? (
            <Image
              source={{ uri: `${process.env.EXPO_PUBLIC_CDN_URL}/${coverImage}` }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder} />
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardInfoTop}>
            <View style={styles.cardInfoTopLeft}>
              <Text style={styles.cardSite} numberOfLines={1}>
                {job.site?.name ?? ''}
              </Text>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {job.title}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardMeta}>
            <Text style={styles.cardWage}>
              {new Intl.NumberFormat('ko-KR').format(job.dailyWage)}{' '}
              <Text style={styles.cardWageUnit}>₫/일</Text>
            </Text>
            {remaining > 0 && !isFull && (
              <View style={styles.remainingBadge}>
                <Text style={styles.remainingText}>잔여 {remaining}명</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardDate}>{formatDate(job.workDate instanceof Date ? job.workDate.toISOString() : (job.workDate ?? ''))}</Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaBtn, isFull && styles.ctaBtnFull]}
        onPress={() => router.push({ pathname: '/(worker)/jobs/[id]', params: { id: job.id } })}
        disabled={isFull}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaBtnText}>
          {isFull ? '마감됨' : '자세히 보기'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main map view ────────────────────────────────────────────────────────────

interface Props {
  jobs: JobWithSite[];
  initialRegion?: Region;
}

export default function JobsMapView({ jobs, initialRegion }: Props) {
  const mapRef = useRef<MapView>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(120)).current;

  // Jobs with valid coordinates
  const jobsWithCoords = jobs.filter(
    j => j.site?.lat != null && j.site?.lng != null
  );

  const selectedJob = selectedJobId
    ? jobsWithCoords.find(j => j.id === selectedJobId) ?? null
    : null;

  const defaultRegion: Region = initialRegion ?? {
    latitude: 14.0583,
    longitude: 108.2772,
    latitudeDelta: 8,
    longitudeDelta: 8,
  };

  // Airbnb-style: animate map to selected job + slide card up
  const selectJob = useCallback((job: JobWithSite) => {
    if (job.site?.lat == null || job.site?.lng == null) return;

    setSelectedJobId(job.id);

    // Animate map to zoom in on selected location
    mapRef.current?.animateToRegion(
      {
        latitude: job.site.lat,
        longitude: job.site.lng,
        latitudeDelta: SELECTED_DELTA,
        longitudeDelta: SELECTED_DELTA,
      },
      420 // ms — slightly slower for Airbnb feel
    );

    // Slide card up from bottom
    slideAnim.setValue(120);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [slideAnim]);

  const deselectJob = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedJobId(null));
  }, [slideAnim]);

  const handleMapPress = useCallback((_e: MapPressEvent) => {
    if (selectedJobId) deselectJob();
  }, [selectedJobId, deselectJob]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={defaultRegion}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {jobsWithCoords.map(job => (
          <Marker
            key={job.id}
            coordinate={{
              latitude: job.site!.lat as number,
              longitude: job.site!.lng as number,
            }}
            onPress={() => selectJob(job)}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={selectedJobId === job.id ? 10 : 1}
          >
            <WageMarker job={job} isSelected={selectedJobId === job.id} />
          </Marker>
        ))}
      </MapView>

      {/* Airbnb-style bottom card */}
      {selectedJob && (
        <View style={styles.cardWrapper} pointerEvents="box-none">
          <JobCard
            job={selectedJob}
            onClose={deselectJob}
            slideAnim={slideAnim}
          />
        </View>
      )}

      {/* Job count badge */}
      <View style={styles.countBadge} pointerEvents="none">
        <Text style={styles.countText}>{jobsWithCoords.length}개 공고</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Wage pill marker
  markerPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerPillSelected: {
    backgroundColor: '#25282A',
    borderColor: '#25282A',
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.12 }],
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#25282A',
  },
  markerTextSelected: {
    color: '#fff',
  },

  // Bottom card
  cardWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 12,
    right: 12,
    zIndex: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  cardImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: '#3186FF',
    overflow: 'hidden',
  },
  cardImagePlaceholder: {
    flex: 1,
    backgroundColor: '#D0E4FF',
    opacity: 0.5,
  },
  cardInfo: {
    flex: 1,
  },
  cardInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
  },
  cardInfoTopLeft: { flex: 1 },
  cardSite: {
    fontSize: 11,
    color: '#7A7B7A',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#25282A',
    lineHeight: 19,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  closeBtnText: { fontSize: 10, color: '#7A7B7A', fontWeight: '600' },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  cardWage: {
    fontSize: 16,
    fontWeight: '800',
    color: '#25282A',
  },
  cardWageUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: '#7A7B7A',
  },
  remainingBadge: {
    backgroundColor: '#D1F3D3',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  remainingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#024209',
  },
  cardDate: {
    fontSize: 11,
    color: '#7A7B7A',
    marginTop: 4,
  },

  // CTA button
  ctaBtn: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#0669F7',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaBtnFull: { backgroundColor: '#B2B2B2' },
  ctaBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Count badge
  countBadge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
