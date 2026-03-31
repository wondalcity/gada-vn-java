import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
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
  const cookieStore = await cookies()
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
    <div className="max-w-[1760px] mx-auto px-4 py-4">
      {/* Back button — desktop only (mobile uses WorkerAppBar back button) */}
      <Link
        href="/worker/jobs"
        className="hidden md:inline-flex items-center gap-1.5 text-sm text-[#98A2B2] mb-4 hover:text-[#0669F7] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        일자리 목록
      </Link>

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
        <div className="mt-6 p-4 bg-white rounded-2xl">
          <p className="text-xs text-[#98A2B2] mb-1">근무 현장</p>
          <Link
            href={`/sites/${job.site.slug}`}
            className="font-semibold text-[#25282A] hover:text-[#0669F7]"
          >
            {job.site.nameKo}
          </Link>
          <p className="text-sm text-[#98A2B2] mt-1">📍 {job.site.address}</p>
        </div>
      )}

      {/* Related jobs */}
      {job.relatedJobs && job.relatedJobs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-[#25282A] mb-3">같은 직종 다른 공고</h2>
          <JobListGrid
            jobs={job.relatedJobs}
            locale={locale}
            basePath={`/worker/jobs`}
          />
        </section>
      )}
    </div>
  )
}
