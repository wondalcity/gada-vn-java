import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { fetchPublicJobBySlug } from '@/lib/api/public'
import { apiClient } from '@/lib/api/client'
import { Link } from '@/components/navigation'
import JobDetailView from '@/components/jobs/JobDetailView'
import { JobListGrid } from '@/components/jobs/JobListGrid'
import { WorkerSignupCTA } from '@/components/public/WorkerSignupCTA'
import { Breadcrumb } from '@/components/public/Breadcrumb'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

// SSR — always fresh for job detail (status, headcount may change)
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const job = await fetchPublicJobBySlug(slug, locale).catch(() => null)
  if (!job) return {}

  const title = `${job.titleKo} | GADA VN`
  const description = (job.descriptionKo ?? job.titleKo ?? '').slice(0, 160)

  return {
    title,
    description,
    alternates: {
      canonical: `https://gada.vn/${locale}/jobs/${slug}`,
      languages: {
        ko: `https://gada.vn/ko/jobs/${slug}`,
        vi: `https://gada.vn/vi/jobs/${slug}`,
        en: `https://gada.vn/en/jobs/${slug}`,
      },
    },
    openGraph: {
      title: job.titleKo,
      description,
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : locale === 'vi' ? 'vi_VN' : 'en_US',
      ...(job.coverImageUrl ? { images: [{ url: job.coverImageUrl }] } : {}),
    },
  }
}

export default async function JobDetailPage({ params }: Props) {
  const { locale, slug } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('gada_session')?.value

  const job = await fetchPublicJobBySlug(slug, locale).catch(() => null)
  if (!job) notFound()

  // Check if worker already applied (server-side, only when logged in)
  let existingApplication: { applicationId: string; status: string; notes?: string | null } | null = null
  if (token) {
    existingApplication = await apiClient<{ applicationId: string; status: string; notes?: string | null } | null>(
      `/jobs/${job.id}/my-application`,
      { token, cache: 'no-store' },
    ).then(r => r.data).catch(() => null)
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.titleKo,
    description: job.descriptionKo ?? job.titleKo,
    datePosted: job.publishedAt,
    validThrough: job.workDate,
    employmentType: 'TEMPORARY',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.site?.nameKo ?? 'GADA VN',
    },
    jobLocation: {
      '@type': 'Place',
      name: job.site?.nameKo,
      address: {
        '@type': 'PostalAddress',
        streetAddress: job.site?.address,
        addressCountry: 'VN',
        addressRegion: job.site?.province,
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'VND',
      value: { '@type': 'QuantitativeValue', value: job.dailyWage, unitText: 'DAY' },
    },
    occupationalCategory: job.tradeNameKo,
    totalJobOpenings: job.slotsTotal - job.slotsFilled,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-8">
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            { label: '공고 목록', href: '/jobs' },
            { label: job.titleKo },
          ]}
        />

        <JobDetailView
          job={job}
          locale={locale}
          isLoggedIn={!!token}
          initialApplicationId={existingApplication?.applicationId}
          initialApplicationStatus={existingApplication?.status}
          initialNotes={existingApplication?.notes ?? undefined}
        />

        {/* Site card */}
        {job.site && (
          <div className="mt-8 p-4 bg-white rounded-lg border border-[#EFF1F5]">
            <p className="text-sm text-[#98A2B2] mb-1">근무 현장</p>
            <Link
              href={`/sites/${job.site.slug}`}
              className="font-semibold text-[#25282A] hover:text-[#0669F7]"
            >
              {job.site.nameKo}
            </Link>
            <p className="text-sm text-[#98A2B2] mt-1">📍 {job.site.address}</p>
            <Link
              href={`/sites/${job.site.slug}`}
              className="text-sm text-[#0669F7] mt-2 inline-block"
            >
              현장 정보 보기 →
            </Link>
          </div>
        )}

        {/* Province link */}
        {job.site?.provinceSlug && (
          <div className="mt-4">
            <Link
              href={`/locations/${job.site.provinceSlug}`}
              className="text-sm text-[#0669F7] hover:underline"
            >
              📍 {job.site.province} 지역 다른 공고 보기 →
            </Link>
          </div>
        )}

        {/* Related jobs */}
        {job.relatedJobs && job.relatedJobs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-[#25282A] mb-4">같은 직종 다른 공고</h2>
            <JobListGrid jobs={job.relatedJobs} locale={locale} />
          </section>
        )}
      </div>

      {/* Signup CTA */}
      <WorkerSignupCTA />
    </>
  )
}
