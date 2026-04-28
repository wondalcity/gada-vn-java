import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, Modal,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { setCurrentScreen } from '../../lib/crashlytics';
import { Colors } from '../../constants/theme';

const CDN = process.env.EXPO_PUBLIC_CDN_URL ?? '';

interface Province {
  code: string;
  nameKo?: string;
  nameVi?: string;
  nameEn?: string;
  jobCount?: number;
}

interface Trade {
  id: number;
  nameKo?: string;
  nameVi?: string;
}

interface Job {
  id: string;
  slug?: string | null;
  titleKo?: string;
  titleVi?: string;
  title?: string;
  siteName?: string;
  siteNameKo?: string;
  site?: { name: string; address?: string; province?: string } | null;
  dailyWage: number;
  workDate?: string | null;
  slotsTotal: number;
  slotsFilled: number;
  coverImageUrl?: string;
  imageS3Keys?: string[];
  coverImageIdx?: number;
  status?: string;
}

const PROVINCE_QUICK_LINKS = [
  { slug: 'ho-chi-minh', labelKo: '호치민', labelVi: 'TP.HCM' },
  { slug: 'hanoi', labelKo: '하노이', labelVi: 'Hà Nội' },
  { slug: 'binh-duong', labelKo: '빈즈엉', labelVi: 'Bình Dương' },
  { slug: 'dong-nai', labelKo: '동나이', labelVi: 'Đồng Nai' },
  { slug: 'da-nang', labelKo: '다낭', labelVi: 'Đà Nẵng' },
  { slug: 'vung-tau', labelKo: '붕따우', labelVi: 'Vũng Tàu' },
];

// Web-style job card for the home screen (matches web JobListingCard)
function HomeJobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const isFull = job.status === 'FILLED' || job.slotsFilled >= job.slotsTotal;
  const displayTitle = job.titleKo || job.titleVi || job.title || '';
  const displaySite = job.siteName || job.siteNameKo || job.site?.name || '';
  const coverUri = job.coverImageUrl
    || (job.imageS3Keys?.[job.coverImageIdx ?? 0] ? `${CDN}/${job.imageS3Keys[job.coverImageIdx ?? 0]}` : null);
  const workDate = job.workDate
    ? new Date(job.workDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return (
    <TouchableOpacity style={styles.jobCard} onPress={onPress} activeOpacity={0.85}>
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={styles.jobCardImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.jobCardImage, styles.jobCardImagePlaceholder]}>
          <Text style={{ fontSize: 32 }}>🏗️</Text>
        </View>
      )}
      <View style={styles.jobCardBody}>
        <Text style={styles.jobCardSiteName} numberOfLines={1}>{displaySite}</Text>
        <Text style={styles.jobCardTitle} numberOfLines={2}>{displayTitle}</Text>
        <View style={styles.jobCardMeta}>
          <Text style={styles.jobCardWage}>₫{job.dailyWage.toLocaleString()}</Text>
          <View style={[styles.statusBadge, isFull && styles.statusBadgeFull]}>
            <Text style={[styles.statusBadgeText, isFull && styles.statusBadgeTextFull]}>
              {isFull ? '마감' : '모집 중'}
            </Text>
          </View>
        </View>
        <View style={styles.jobCardFooter}>
          <Text style={styles.jobCardDate}>📅 {workDate}</Text>
          <Text style={styles.jobCardSlots}>👷 {job.slotsFilled}/{job.slotsTotal}명</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Province card for "지역별 공고 찾기" section
function ProvinceCard({ nameKo, nameVi, onPress }: { nameKo: string; nameVi: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.provinceCard} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.provinceCardName}>{nameKo || nameVi}</Text>
      <Text style={styles.provinceCardLink}>공고 보기 →</Text>
    </TouchableOpacity>
  );
}

export default function WorkerHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search form state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);

  // Picker modal state
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showTradePicker, setShowTradePicker] = useState(false);

  useEffect(() => {
    setCurrentScreen('worker/home');
  }, []);

  useEffect(() => {
    const locale = i18n.language === 'vi' ? 'vi' : 'ko';
    Promise.all([
      api.get<Province[]>('/public/provinces').catch(() => [] as Province[]),
      api.get<Trade[]>(`/public/trades?locale=${locale}`).catch(() => [] as Trade[]),
      api.getPaginated<Job>('/public/jobs', { page: 1, limit: 6, locale }).catch(() => ({ data: [] as Job[], meta: { total: 0, page: 1, totalPages: 1 } })),
    ]).then(([pRes, trRes, jPaged]) => {
      const p = Array.isArray(pRes) ? pRes : [];
      const tr = Array.isArray(trRes) ? trRes : [];
      const j = jPaged.data ?? [];
      const total = jPaged.meta?.total ?? j.length;
      setProvinces(p.slice(0, 8));
      setTrades(tr);
      setJobs(j.slice(0, 6));
      setTotalJobs(total);
    }).finally(() => setLoading(false));
  }, [i18n.language]);

  const handleSearch = useCallback(() => {
    const params: Record<string, string> = {};
    if (searchQuery.trim()) params.q = searchQuery.trim();
    if (selectedProvince) params.province = selectedProvince;
    if (selectedTradeId) params.tradeId = String(selectedTradeId);
    router.push({ pathname: '/(worker)/', params } as any);
  }, [searchQuery, selectedProvince, selectedTradeId, router]);

  const handleMapView = useCallback(() => {
    router.push({ pathname: '/(worker)/', params: { viewMode: 'map' } } as any);
  }, [router]);

  const selectedProvinceObj = provinces.find(p => p.code === selectedProvince);
  const selectedProvinceName = selectedProvince
    ? (selectedProvinceObj?.nameKo || selectedProvinceObj?.nameVi || selectedProvince)
    : t('jobs.filter_province_all') || '전체 지역';

  const selectedTradeName = selectedTradeId
    ? (trades.find(tr => tr.id === selectedTradeId)?.nameKo ?? String(selectedTradeId))
    : t('jobs.filter_trade_all') || '전체 직종';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Hero: dark construction gradient (matches web app) ── */}
      <View style={styles.hero}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{t('landing.hero_title')}</Text>
          <Text style={styles.heroSubtitle}>{t('landing.hero_subtitle')}</Text>

          {/* Search form — mirrors web HeroSearch */}
          <View style={styles.searchCard}>
            {/* Text input */}
            <View style={styles.searchInputRow}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="공고명 또는 현장명 검색..."
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
            </View>
            {/* Province picker */}
            <TouchableOpacity style={styles.pickerRow} onPress={() => setShowProvincePicker(true)} activeOpacity={0.8}>
              <Text style={[styles.pickerText, selectedProvince ? styles.pickerTextSelected : null]}>
                {selectedProvinceName}
              </Text>
              <Text style={styles.pickerChevron}>▾</Text>
            </TouchableOpacity>
            {/* Trade picker */}
            <TouchableOpacity style={styles.pickerRow} onPress={() => setShowTradePicker(true)} activeOpacity={0.8}>
              <Text style={[styles.pickerText, selectedTradeId ? styles.pickerTextSelected : null]}>
                {selectedTradeName}
              </Text>
              <Text style={styles.pickerChevron}>▾</Text>
            </TouchableOpacity>
            {/* Action buttons */}
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
              <Text style={styles.searchBtnText}>🔍  {t('landing.find_jobs_btn') || '검색하기'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapBtn} onPress={handleMapView} activeOpacity={0.85}>
              <Text style={styles.mapBtnText}>🗺  지도로 보기</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalJobs > 0 ? `${totalJobs}+` : '12+'}</Text>
              <Text style={styles.statLabel}>{t('landing.stat_jobs') || '활성 공고'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{provinces.length > 0 ? `${provinces.length}+` : '15+'}</Text>
              <Text style={styles.statLabel}>{t('landing.stat_cities') || '도시'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{t('landing.stat_free_value') || '무료'}</Text>
              <Text style={styles.statLabel}>{t('landing.stat_signup') || '회원가입'}</Text>
            </View>
          </View>

          {/* Province quick link pills — matches web app's bg-white/15 pills */}
          <View style={styles.provinceQuickLinks}>
            {PROVINCE_QUICK_LINKS.map(({ slug, labelKo, labelVi }) => (
              <TouchableOpacity
                key={slug}
                style={styles.quickPill}
                onPress={() => router.push({ pathname: '/(worker)/', params: { province: slug } } as any)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickPillText}>
                  {i18n.language === 'vi' ? labelVi : labelKo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── 지역별 공고 찾기 (province cards — matches web's province grid) ── */}
      {provinces.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>지역별 공고 찾기</Text>
          <View style={styles.provinceGrid}>
            {provinces.map((p) => (
              <ProvinceCard
                key={p.code}
                nameKo={p.nameKo}
                nameVi={p.nameVi}
                onPress={() => router.push({ pathname: '/(worker)/', params: { province: p.code } } as any)}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── Today's Jobs (matches web app's grid of JobListingCards) ── */}
      <View style={[styles.section, styles.sectionGray]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('landing.latest_jobs_title') || '오늘의 일자리'}</Text>
          <TouchableOpacity onPress={() => router.push('/(worker)/' as any)}>
            <Text style={styles.viewAll}>전체 보기 →</Text>
          </TouchableOpacity>
        </View>
        {jobs.length === 0 ? (
          <Text style={styles.emptyText}>{t('jobs.no_jobs_today')}</Text>
        ) : (
          <View style={styles.jobGrid}>
            {jobs.map((job) => (
              <HomeJobCard
                key={job.id}
                job={job}
                onPress={() => router.push({ pathname: '/(worker)/jobs/[id]', params: { id: job.id } })}
              />
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.allJobsBtn}
          onPress={() => router.push('/(worker)/' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.allJobsBtnText}>{t('landing.all_jobs_btn') || '전체 공고 보기'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats section (matches web's bg-brand-50 stats) ── */}
      <View style={styles.statsSection}>
        {[
          { num: '5,000+', label: '등록 근로자' },
          { num: '200+', label: '현장 관리자' },
          { num: '₫500K', label: '최고 일당' },
        ].map(({ num, label }) => (
          <View key={label} style={styles.statsSectionItem}>
            <Text style={styles.statsSectionNum}>{num}</Text>
            <Text style={styles.statsSectionLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── CTA (dark construction, matches web app) ── */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>{t('landing.cta_title') || '가다 VN 앱을 시작하세요'}</Text>
        <Text style={styles.ctaSubtitle}>{t('landing.cta_subtitle') || '프로필을 완성하고 바로 지원하세요'}</Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push('/(worker)/profile' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>{t('landing.cta_btn') || '프로필 완성하기'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />

      {/* ── Province Picker Modal ── */}
      <Modal visible={showProvincePicker} transparent animationType="slide" onRequestClose={() => setShowProvincePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProvincePicker(false)}>
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerSheetTitle}>지역 선택</Text>
            <TouchableOpacity style={styles.pickerOption} onPress={() => { setSelectedProvince(''); setShowProvincePicker(false); }}>
              <Text style={[styles.pickerOptionText, !selectedProvince && styles.pickerOptionTextActive]}>전체 지역</Text>
              {!selectedProvince && <Text style={styles.pickerCheck}>✓</Text>}
            </TouchableOpacity>
            <FlatList
              data={provinces}
              keyExtractor={p => p.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => { setSelectedProvince(item.code); setShowProvincePicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, selectedProvince === item.code && styles.pickerOptionTextActive]}>
                    {item.nameKo || item.nameVi}
                  </Text>
                  {selectedProvince === item.code && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Trade Picker Modal ── */}
      <Modal visible={showTradePicker} transparent animationType="slide" onRequestClose={() => setShowTradePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTradePicker(false)}>
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerSheetTitle}>직종 선택</Text>
            <TouchableOpacity style={styles.pickerOption} onPress={() => { setSelectedTradeId(null); setShowTradePicker(false); }}>
              <Text style={[styles.pickerOptionText, !selectedTradeId && styles.pickerOptionTextActive]}>전체 직종</Text>
              {!selectedTradeId && <Text style={styles.pickerCheck}>✓</Text>}
            </TouchableOpacity>
            <FlatList
              data={trades}
              keyExtractor={tr => String(tr.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => { setSelectedTradeId(item.id); setShowTradePicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, selectedTradeId === item.id && styles.pickerOptionTextActive]}>
                    {item.nameKo}
                  </Text>
                  {selectedTradeId === item.id && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Hero (dark construction, matches web) ──
  hero: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecor1: {
    position: 'absolute', top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,107,44,0.08)',
  },
  heroDecor2: {
    position: 'absolute', bottom: -40, left: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroContent: { position: 'relative' },
  heroTitle: {
    fontSize: 26, fontWeight: '900', color: '#fff',
    marginBottom: 6, lineHeight: 34, textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
    marginBottom: 20, lineHeight: 20, textAlign: 'center',
  },

  // ── Search card (matches web HeroSearch bg-white/10) ──
  searchCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#25282A' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  pickerText: { fontSize: 14, color: '#9CA3AF' },
  pickerTextSelected: { color: '#25282A', fontWeight: '600' },
  pickerChevron: { fontSize: 12, color: '#9CA3AF' },

  // Search button (orange — matches web's bg-brand)
  searchBtn: {
    backgroundColor: Colors.brand,
    borderRadius: 12, paddingVertical: 13,
    alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Map button (semi-transparent white — matches web's secondary button)
  mapBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 13,
    alignItems: 'center',
  },
  mapBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Stats row
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16, gap: 0,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.brand },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Province quick link pills (matches web's bg-white/15 pills)
  provinceQuickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  quickPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
  },
  quickPillText: { fontSize: 13, color: '#fff', fontWeight: '500' },

  // ── Sections ──
  section: { backgroundColor: '#fff', padding: 20 },
  sectionGray: { backgroundColor: '#F8F8FA' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#25282A', marginBottom: 12 },
  viewAll: { fontSize: 13, color: Colors.brand, fontWeight: '600' },
  emptyText: { color: '#98A2B2', fontSize: 14, textAlign: 'center', paddingVertical: 24 },

  // ── Province cards (matches web province grid: white cards) ──
  provinceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  provinceCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFF1F5',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  provinceCardName: { fontSize: 14, fontWeight: '700', color: '#25282A', marginBottom: 4 },
  provinceCardLink: { fontSize: 12, color: '#9CA3AF' },

  // ── Job cards grid (matches web's JobListingCard) ──
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  jobCard: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  jobCardImage: { width: '100%', height: 120 },
  jobCardImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  jobCardBody: { padding: 12, gap: 4 },
  jobCardSiteName: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  jobCardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  jobCardMeta: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 6,
  },
  jobCardWage: { fontSize: 15, fontWeight: '800', color: Colors.brand },
  statusBadge: {
    backgroundColor: '#FFF3EE', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusBadgeFull: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.brand },
  statusBadgeTextFull: { color: '#9CA3AF' },
  jobCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 6,
  },
  jobCardDate: { fontSize: 11, color: '#9CA3AF' },
  jobCardSlots: { fontSize: 11, color: '#9CA3AF' },

  allJobsBtn: {
    marginTop: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.brand,
    paddingVertical: 13, alignItems: 'center',
  },
  allJobsBtnText: { color: Colors.brand, fontSize: 14, fontWeight: '700' },

  // ── Stats section (matches web's bg-brand-50) ──
  statsSection: {
    backgroundColor: '#FFF3EE',
    paddingVertical: 28, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-around',
  },
  statsSectionItem: { alignItems: 'center' },
  statsSectionNum: { fontSize: 24, fontWeight: '900', color: Colors.brand },
  statsSectionLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  // ── CTA section (dark construction) ──
  ctaSection: {
    backgroundColor: '#1A1A2E',
    padding: 28, alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20, fontWeight: '900', color: '#fff',
    textAlign: 'center', marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', marginBottom: 20, lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: Colors.brand, borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Picker modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '60%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDDDDD', alignSelf: 'center', marginBottom: 16,
  },
  pickerSheetTitle: {
    fontSize: 16, fontWeight: '700', color: '#25282A',
    textAlign: 'center', marginBottom: 12,
  },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: { fontSize: 15, color: '#6B7280' },
  pickerOptionTextActive: { color: Colors.brand, fontWeight: '700' },
  pickerCheck: { fontSize: 16, color: Colors.brand, fontWeight: '700' },
});
