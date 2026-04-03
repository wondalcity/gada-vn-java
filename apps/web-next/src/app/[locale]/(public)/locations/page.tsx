import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { fetchProvinces } from '@/lib/api/public'
import { Breadcrumb } from '@/components/public/Breadcrumb'

interface Props {
  params: Promise<{ locale: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'locations' })
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `https://gada.vn/${locale}/locations`,
      languages: {
        ko: 'https://gada.vn/ko/locations',
        vi: 'https://gada.vn/vi/locations',
        en: 'https://gada.vn/en/locations',
      },
    },
  }
}

// ── Province visual themes ────────────────────────────────────────────────
// Highlight major cities with distinct colors; remaining provinces fall back
// to a region-based gradient determined by slug prefix.
const PROVINCE_THEMES: Record<string, {
  gradient: string
  icon: string
  regionKey: string
}> = {
  'hn':    { gradient: 'from-[#1A1A2E] to-[#16213E]', icon: '🏛️', regionKey: 'red_river_delta' },
  'hcm':   { gradient: 'from-[#0F3460] to-[#533483]', icon: '🌆', regionKey: 'southeast' },
  'dn':    { gradient: 'from-[#0A3D62] to-[#1289A7]', icon: '🌊', regionKey: 'south_central' },
  'hp':    { gradient: 'from-[#006266] to-[#1289A7]', icon: '⚓', regionKey: 'red_river_delta' },
  'ct':    { gradient: 'from-[#1B6CA8] to-[#006266]', icon: '🛶', regionKey: 'mekong_delta' },
  'bd':    { gradient: 'from-[#6A3093] to-[#A044FF]', icon: '🏭', regionKey: 'southeast' },
  'dn-t':  { gradient: 'from-[#134E5E] to-[#71B280]', icon: '🌿', regionKey: 'southeast' },
  'qni':   { gradient: 'from-[#1565C0] to-[#42A5F5]', icon: '⛰️', regionKey: 'northeast' },
  'br-vt': { gradient: 'from-[#E65C00] to-[#F9D423]', icon: '🛢️', regionKey: 'southeast' },
  'la':    { gradient: 'from-[#1D8348] to-[#27AE60]', icon: '🌾', regionKey: 'mekong_delta' },
}

// Region-based fallback gradients keyed by province slug prefix
const REGION_GRADIENTS: Array<{ test: (slug: string) => boolean; gradient: string; regionKey: string }> = [
  { test: (s) => ['ha-', 'bac-', 'vinh-', 'hung-', 'ninh-binh', 'thai-', 'tuyen-', 'cao-', 'lang-', 'lao-', 'yen-', 'hoa-', 'son-', 'dien-'].some(p => s.startsWith(p)),
    gradient: 'from-[#1a3a5c] to-[#2d6a9f]', regionKey: 'north' },
  { test: (s) => ['thanh-', 'nghe-', 'ha-tinh', 'quang-binh', 'quang-tri', 'thua-thien'].some(p => s.startsWith(p)),
    gradient: 'from-[#5c3a1a] to-[#9f6a2d]', regionKey: 'north_central' },
  { test: (s) => ['quang-', 'binh-dinh', 'phu-yen', 'khanh-hoa', 'ninh-thuan', 'binh-thuan'].some(p => s.startsWith(p)),
    gradient: 'from-[#1a5c4a] to-[#2d9f7a]', regionKey: 'south_central' },
  { test: (s) => ['kon-tum', 'gia-lai', 'dak-lak', 'dak-nong', 'lam-dong'].some(p => s.startsWith(p)),
    gradient: 'from-[#2d5c1a] to-[#4a9f2d]', regionKey: 'central_highlands' },
  { test: (s) => ['ba-ria', 'binh-phuoc', 'tay-ninh'].some(p => s.startsWith(p)),
    gradient: 'from-[#5c1a4a] to-[#9f2d7a]', regionKey: 'southeast' },
  { test: (s) => ['an-giang', 'ben-tre', 'dong-thap', 'hau-giang', 'kien-giang', 'soc-trang', 'tien-giang', 'tra-vinh', 'vinh-long', 'bac-lieu', 'ca-mau'].some(p => s.startsWith(p)),
    gradient: 'from-[#1a5c3a] to-[#2d9f5a]', regionKey: 'mekong_delta' },
]

function getProvinceTheme(slug: string) {
  if (PROVINCE_THEMES[slug]) return PROVINCE_THEMES[slug]
  const match = REGION_GRADIENTS.find(r => r.test(slug))
  return {
    gradient: match?.gradient ?? 'from-[#2c3e50] to-[#3498db]',
    icon: '🏗️',
    regionKey: match?.regionKey ?? 'vietnam',
  }
}

export default async function LocationsPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'locations' })
  const provinces = await fetchProvinces(locale).catch(() => [])

  // Pin major provinces first
  const PINNED = ['hn', 'hcm', 'dn', 'hp', 'ct']
  const sorted = [
    ...PINNED.map(slug => provinces.find(p => p.slug === slug)).filter(Boolean),
    ...provinces.filter(p => !PINNED.includes(p.slug)),
  ] as typeof provinces

  return (
    <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-8">
      <Breadcrumb
        items={[
          { label: t('breadcrumb_home'), href: '/' },
          { label: t('breadcrumb_locations') },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#25282A]">{t('heading')}</h1>
        <p className="text-sm text-[#98A2B2] mt-1">
          {t('subtitle', { count: provinces.length })}
        </p>
      </div>

      {provinces.length === 0 ? (
        <div className="text-center py-16 text-[#98A2B2]">{t('loading')}</div>
      ) : (
        <>
          {/* ── Featured provinces (top 5) ─────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {sorted.slice(0, 5).map((province) => {
              const theme = getProvinceTheme(province.slug)
              return (
                <Link
                  key={province.code}
                  href={`/${locale}/locations/${province.slug}`}
                  className="group block relative overflow-hidden rounded-2xl aspect-[4/5] shadow-sm hover:shadow-lg transition-shadow"
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} transition-transform duration-300 group-hover:scale-105`} />

                  {/* Decorative large initial */}
                  <div className="absolute right-2 top-2 text-7xl font-black opacity-10 text-white leading-none select-none">
                    {province.nameVi.charAt(0)}
                  </div>

                  {/* Construction pattern lines */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="w-full h-full" style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
                      backgroundSize: '12px 12px',
                    }} />
                  </div>

                  {/* Bottom overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Icon */}
                  <div className="absolute top-3 left-3 text-2xl">{theme.icon}</div>

                  {/* Text */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight">{province.nameVi}</p>
                    <p className="text-white/60 text-[11px] mt-0.5">{province.nameEn}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white/90">
                      {t(`regions.${theme.regionKey}` as any)}
                    </span>
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* ── All provinces grid ─────────────────────────────────── */}
          <h2 className="text-sm font-bold text-[#98A2B2] uppercase tracking-wider mb-3 mt-6">{t('all_regions')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {sorted.slice(5).map((province) => {
              const theme = getProvinceTheme(province.slug)
              return (
                <Link
                  key={province.code}
                  href={`/${locale}/locations/${province.slug}`}
                  className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-[#EFF1F5] hover:border-[#0669F7] hover:shadow-sm transition-all"
                >
                  {/* Mini gradient thumbnail */}
                  <div className={`w-9 h-9 rounded-lg shrink-0 bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-base`}>
                    {theme.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#25282A] truncate group-hover:text-[#0669F7] transition-colors">
                      {province.nameVi}
                    </p>
                    <p className="text-[11px] text-[#98A2B2] truncate">{province.nameEn}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
