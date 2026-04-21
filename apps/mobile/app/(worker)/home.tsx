import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../lib/api-client';

const CDN = process.env.EXPO_PUBLIC_CDN_URL ?? '';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://gada.vn';

interface Province {
  code: string;
  nameKo: string;
  nameVi: string;
  jobCount?: number;
}

interface Job {
  id: string;
  slug: string;
  titleKo: string;
  siteName: string;
  dailyWage: number;
  workDate: string;
  slotsTotal: number;
  slotsFilled: number;
  coverImageS3Key?: string | null;
  province?: string;
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const isFull = job.slotsFilled >= job.slotsTotal;
  return (
    <TouchableOpacity style={styles.jobCard} onPress={onPress} activeOpacity={0.8}>
      {job.coverImageS3Key ? (
        <Image
          source={{ uri: `${CDN}/${job.coverImageS3Key}` }}
          style={styles.jobCardImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.jobCardImage, styles.jobCardImagePlaceholder]}>
          <Text style={{ fontSize: 28 }}>🏗️</Text>
        </View>
      )}
      <View style={styles.jobCardBody}>
        <Text style={styles.jobCardTitle} numberOfLines={2}>{job.titleKo}</Text>
        <Text style={styles.jobCardSite} numberOfLines={1}>{job.siteName}</Text>
        <View style={styles.jobCardFooter}>
          <Text style={styles.jobCardWage}>
            ₫{new Intl.NumberFormat('ko-KR').format(job.dailyWage)}
          </Text>
          <View style={[styles.slotBadge, isFull && styles.slotBadgeFull]}>
            <Text style={[styles.slotText, isFull && styles.slotTextFull]}>
              {isFull ? '마감' : `${job.slotsTotal - job.slotsFilled}명 남음`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function WorkerHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Province[]>('/public/provinces').catch(() => [] as Province[]),
      api.get<{ jobs: Job[]; total: number }>('/jobs?page=1&limit=6', {}).catch(() => ({ jobs: [], total: 0 })),
    ]).then(([pRes, jRes]) => {
      const p = Array.isArray(pRes) ? pRes : [];
      const j = (jRes as any).jobs ?? (Array.isArray(jRes) ? jRes : []);
      const total = (jRes as any).total ?? j.length;
      setProvinces(p.slice(0, 8));
      setJobs(j.slice(0, 6));
      setTotalJobs(total);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0669F7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{t('landing.hero_title')}</Text>
          <Text style={styles.heroSubtitle}>{t('landing.hero_subtitle')}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard value={`${totalJobs.toLocaleString()}+`} label={t('landing.stat_jobs')} />
            <View style={styles.statDivider} />
            <StatCard value={`${provinces.length || 63}+`} label={t('landing.stat_cities')} />
            <View style={styles.statDivider} />
            <StatCard value={t('landing.stat_free_value')} label={t('landing.stat_signup')} />
          </View>

          {/* Search CTA */}
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => router.push('/(worker)/index' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.searchBtnText}>🔍  {t('landing.find_jobs_btn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Provinces */}
      {provinces.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('landing.provinces_title')}</Text>
          <View style={styles.provinceGrid}>
            {provinces.map((p) => (
              <TouchableOpacity
                key={p.code}
                style={styles.provinceChip}
                onPress={() => router.push('/(worker)/index' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.provinceChipText}>{p.nameKo || p.nameVi}</Text>
                {p.jobCount != null && (
                  <Text style={styles.provinceChipCount}>{p.jobCount}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Latest Jobs */}
      <View style={[styles.section, styles.sectionGray]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('landing.latest_jobs_title')}</Text>
          <TouchableOpacity onPress={() => router.push('/(worker)/index' as any)}>
            <Text style={styles.viewAll}>{t('landing.view_all')}</Text>
          </TouchableOpacity>
        </View>
        {jobs.length === 0 ? (
          <Text style={styles.emptyText}>{t('jobs.no_jobs_today')}</Text>
        ) : (
          <View style={styles.jobGrid}>
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPress={() => router.push({ pathname: '/(worker)/jobs/[id]', params: { id: job.id } })}
              />
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.allJobsBtn}
          onPress={() => router.push('/(worker)/index' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.allJobsBtnText}>{t('landing.all_jobs_btn')}</Text>
        </TouchableOpacity>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>{t('landing.cta_title')}</Text>
        <Text style={styles.ctaSubtitle}>{t('landing.cta_subtitle')}</Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push('/(worker)/profile' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>{t('landing.cta_btn')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero
  hero: {
    backgroundColor: '#0669F7',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecor1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDecor2: {
    position: 'absolute', bottom: -30, right: 40,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroContent: { position: 'relative' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 6, lineHeight: 32 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 20, lineHeight: 20 },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  searchBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchBtnText: { color: '#0669F7', fontWeight: '700', fontSize: 15 },

  // Sections
  section: { backgroundColor: '#fff', padding: 20 },
  sectionGray: { backgroundColor: '#F8F8FA' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#25282A', marginBottom: 12 },
  viewAll: { fontSize: 13, color: '#0669F7', fontWeight: '600' },

  // Provinces
  provinceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  provinceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#F2F4F5', borderRadius: 20,
  },
  provinceChipText: { fontSize: 13, color: '#25282A', fontWeight: '500' },
  provinceChipCount: { fontSize: 11, color: '#0669F7', fontWeight: '700' },

  // Job grid (2 columns)
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  jobCard: {
    width: '48%', backgroundColor: '#fff',
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EFF1F5',
  },
  jobCardImage: { width: '100%', height: 100 },
  jobCardImagePlaceholder: { backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center' },
  jobCardBody: { padding: 10, gap: 4 },
  jobCardTitle: { fontSize: 13, fontWeight: '700', color: '#25282A', lineHeight: 18 },
  jobCardSite: { fontSize: 11, color: '#98A2B2' },
  jobCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  jobCardWage: { fontSize: 13, fontWeight: '800', color: '#0669F7' },
  slotBadge: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  slotBadgeFull: { backgroundColor: '#FFEBEE' },
  slotText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' },
  slotTextFull: { color: '#C62828' },

  allJobsBtn: {
    marginTop: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#0669F7',
    paddingVertical: 12, alignItems: 'center',
  },
  allJobsBtnText: { color: '#0669F7', fontSize: 14, fontWeight: '700' },

  // CTA
  ctaSection: {
    backgroundColor: '#0F2247',
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  ctaSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  ctaBtn: {
    backgroundColor: '#0669F7', borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyText: { color: '#98A2B2', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
