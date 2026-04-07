import { Link } from '@/components/navigation'
import type { PublicSite, PublicJob } from '@/lib/api/public'
import { Breadcrumb } from '@/components/public/Breadcrumb'
import { JobListGrid } from '@/components/jobs/JobListGrid'
import { WorkerSignupCTA } from '@/components/public/WorkerSignupCTA'

interface Props {
  site: PublicSite
  jobs: PublicJob[]
  locale: string
}

export function SiteDetailView({ site, jobs, locale }: Props) {
  const images = site.imageUrls ?? (site.coverImageUrl ? [site.coverImageUrl] : [])

  return (
    <div>
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            { label: '공고 목록', href: '/jobs' },
            { label: site.nameKo },
          ]}
        />

        {/* Header */}
        <div className="flex flex-wrap items-start gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-[#25282A]">{site.nameKo}</h1>
            {site.nameVi && site.nameVi !== site.nameKo && (
              <p className="text-sm text-[#98A2B2] mt-1">{site.nameVi}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-[#0669F7] bg-[#E6F0FE] border border-[#B3D9FF] px-3 py-1 rounded-full">
              {site.province}
            </span>
            <span className="text-xs font-medium text-[#1A6B1A] bg-[#E6F9E6] border border-[#86D98A] px-3 py-1 rounded-full">
              활성 공고 {site.activeJobCount}건
            </span>
          </div>
        </div>

        {/* Image gallery */}
        {images.length > 0 && (
          <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
            {images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${site.nameKo} 현장 이미지 ${i + 1}`}
                loading="lazy"
                className="h-48 w-72 shrink-0 rounded-lg object-cover border border-[#EFF1F5]"
              />
            ))}
          </div>
        )}
        {images.length === 0 && (
          <div className="mb-8 h-48 rounded-lg bg-[#0669F7] flex items-center justify-center">
            <span className="text-4xl font-black text-white/30">{site.nameKo.charAt(0)}</span>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white border border-[#EFF1F5] rounded-lg p-4">
            <p className="text-xs text-[#98A2B2] mb-1">주소</p>
            <p className="text-sm font-medium text-[#25282A]">{site.address}</p>
          </div>

          {site.siteType && (
            <div className="bg-white border border-[#EFF1F5] rounded-lg p-4">
              <p className="text-xs text-[#98A2B2] mb-1">현장 유형</p>
              <p className="text-sm font-medium text-[#25282A]">{site.siteType}</p>
            </div>
          )}

          {site.managerCompany && (
            <div className="bg-white border border-[#EFF1F5] rounded-lg p-4">
              <p className="text-xs text-[#98A2B2] mb-1">관리 회사</p>
              <p className="text-sm font-medium text-[#25282A]">{site.managerCompany}</p>
            </div>
          )}

          {site.lat && site.lng && (
            <div className="bg-white border border-[#EFF1F5] rounded-lg p-4">
              <p className="text-xs text-[#98A2B2] mb-1">위치</p>
              <a
                href={`https://maps.google.com/?q=${site.lat},${site.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#0669F7] hover:underline"
              >
                Google Maps에서 보기 →
              </a>
            </div>
          )}
        </div>

        {/* Jobs section */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#25282A] mb-4">
            이 현장의 공고{' '}
            <span className="text-[#0669F7]">({jobs.length}건)</span>
          </h2>
          <JobListGrid
            jobs={jobs}
            locale={locale}
            emptyMessage="현재 모집 중인 공고가 없습니다."
          />
        </section>

        {/* Internal navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <Link
            href="/jobs"
            className="text-sm text-[#0669F7] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            전체 공고로 돌아가기
          </Link>
          <Link
            href={`/locations/${site.provinceSlug}`}
            className="text-sm text-[#0669F7] hover:underline"
          >
            {site.province} 지역 공고 보기 →
          </Link>
        </div>
      </div>

      {/* CTA */}
      {jobs.length > 0 && (
        <WorkerSignupCTA locale={locale} />
      )}
    </div>
  )
}
