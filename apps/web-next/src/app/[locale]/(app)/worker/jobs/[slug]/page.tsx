import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { fetchPublicJobBySlug } from '@/lib/api/public'
import { apiClient } from '@/lib/api/client'
import { Link } from '@/components/navigation'
import JobDetailView from '@/components/jobs/JobDetailView'
import { JobListGrid } from '@/components/jobs/JobListGrid'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function WorkerJobDetailPage({ params }: Props) {
  const { locale, slug } = await params
  const [cookieStore, t] = await Promise.all([
    cookies(),
    getTranslations({ locale, namespace: 'jobs' }),
  ])
  const token = cookieStore.get('gada_session')?.value

  const job = await fetchPublicJobBySlug(slug, locale).catch(() => null)
  if (!job) notFound()

  let existingApplication: { applicationId: string; status: string; notes?: string | null } | null = null
  if (token) {
    existingApplication = await apiClient<{ applicationId: string; status: string; notes?: string | null } | null>(
      `/jobs/${job.id}/my-application`,
      { token, cache: 'no-store' },
    ).then(r => r.data).catch(() => null)
  }

  return (
    <>
      {/* Back button — desktop only */}
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-4 pb-0">
        <Link
          href="/worker/jobs"
          className="hidden md:inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#222222] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('detail.back_to_list')}
        </Link>
      </div>

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
            <JobListGrid
              jobs={job.relatedJobs}
              locale={locale}
              basePath="/worker/jobs"
            />
          </div>
        </section>
      )}
    </>
  )
}
