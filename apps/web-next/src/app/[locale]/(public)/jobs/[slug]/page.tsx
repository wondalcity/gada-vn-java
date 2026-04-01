import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { fetchPublicJobBySlug } from '@/lib/api/public'
import { apiClient } from '@/lib/api/client'
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
  const [cookieStore, t] = await Promise.all([
    cookies(),
    getTranslations({ locale, namespace: 'jobs' }),
  ])
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

      {/* Breadcrumb */}
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-6 pb-0">
        <Breadcrumb
          items={[
            { label: t('listing.breadcrumb_home'), href: '/' },
            { label: t('listing.breadcrumb_jobs'), href: '/jobs' },
            { label: job.titleKo },
          ]}
        />
      </div>

      {/* Detail view (gallery + content + booking card) */}
      <JobDetailView
        job={job}
        locale={locale}
        isLoggedIn={!!token}
        initialApplicationId={existingApplication?.applicationId}
        initialApplicationStatus={existingApplication?.status}
        initialNotes={existingApplication?.notes ?? undefined}
      />

      {/* Related jobs */}
      {job.relatedJobs && job.relatedJobs.length > 0 && (
        <section className="max-w-[1120px] mx-auto px-4 sm:px-6 pb-12">
          <div className="border-t border-[#DDDDDD] pt-10">
            <h2 className="text-[20px] font-semibold text-[#222222] mb-6">{t('detail.related_jobs')}</h2>
            <JobListGrid jobs={job.relatedJobs} locale={locale} />
          </div>
        </section>
      )}

      {/* Signup CTA */}
      <WorkerSignupCTA locale={locale} />
    </>
  )
}
