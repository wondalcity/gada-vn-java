import { Link } from '@/components/navigation'
import type { Province, Trade, PublicJob } from '@/lib/api/public'
import { Breadcrumb } from '@/components/public/Breadcrumb'
import { JobListGrid } from '@/components/jobs/JobListGrid'
import { Pagination } from '@/components/jobs/Pagination'
import { ProvinceGrid } from '@/components/public/ProvinceGrid'
import { WorkerSignupCTA } from '@/components/public/WorkerSignupCTA'

interface Props {
  province: Province
  jobs: PublicJob[]
  total: number
  page: number
  totalPages: number
  trades: Trade[]
  selectedTrade?: number
  locale: string
}

export function ProvinceJobsView({
  province,
  jobs,
  total,
  page,
  totalPages,
  trades,
  selectedTrade,
  locale,
}: Props) {
  const basePath = `/locations/${province.slug}`

  return (
    <div>
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            { label: '공고 목록', href: '/jobs' },
            { label: `${province.nameVi} 건설 일자리` },
          ]}
        />

        {/* Hero */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-[#25282A]">
              {province.nameVi} 지역 건설 일자리
            </h1>
            <span className="text-sm font-semibold text-[#0669F7] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              {total}건
            </span>
          </div>
          <p className="text-sm text-[#98A2B2]">
            {province.nameVi} ({province.nameEn}) 지역의 건설 현장 일용직 공고를 확인하세요.
          </p>
        </div>

        {/* Trade filter — pill buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={basePath}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !selectedTrade
                ? 'bg-[#0669F7] text-white border-[#0669F7]'
                : 'bg-white text-[#98A2B2] border-[#EFF1F5] hover:border-[#0669F7] hover:text-[#0669F7]'
            }`}
          >
            전체
          </Link>
          {trades.map(t => (
            <Link
              key={t.id}
              href={`${basePath}?trade=${t.id}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedTrade === t.id
                  ? 'bg-[#0669F7] text-white border-[#0669F7]'
                  : 'bg-white text-[#98A2B2] border-[#EFF1F5] hover:border-[#0669F7] hover:text-[#0669F7]'
              }`}
            >
              {t.nameKo}
            </Link>
          ))}
        </div>

        {/* Job grid */}
        <JobListGrid
          jobs={jobs}
          locale={locale}
          emptyMessage="현재 이 지역의 공고가 없습니다."
        />

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath={basePath}
          searchParams={selectedTrade ? { trade: String(selectedTrade) } : undefined}
        />
      </div>

      {/* WorkerSignupCTA */}
      <WorkerSignupCTA
        title={`${province.nameVi}에서 건설 일자리를 찾고 있나요?`}
        subtitle="GADA VN에 가입하고 지역 내 최신 공고를 가장 빠르게 확인하세요"
      />

      {/* Other regions section */}
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#25282A]">다른 지역 공고 보기</h2>
          <Link href="/jobs" className="text-sm text-[#0669F7] hover:underline">
            전체 공고 →
          </Link>
        </div>
        <ProvinceGrid
          provinces={[
            { code: 'HN', nameVi: 'Hà Nội', nameEn: 'Hanoi', slug: 'hn' },
            { code: 'HCM', nameVi: 'Hồ Chí Minh', nameEn: 'Ho Chi Minh City', slug: 'hcm' },
            { code: 'DN', nameVi: 'Đà Nẵng', nameEn: 'Da Nang', slug: 'dn' },
            { code: 'HP', nameVi: 'Hải Phòng', nameEn: 'Hai Phong', slug: 'hp' },
            { code: 'BD', nameVi: 'Bình Dương', nameEn: 'Binh Duong', slug: 'bd' },
          ].filter(p => p.slug !== province.slug)}
          locale={locale}
        />
      </div>
    </div>
  )
}
