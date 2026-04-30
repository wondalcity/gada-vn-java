import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import JobFormWrapper from '@/components/manager/job/JobFormWrapper'
import type { Job } from '@/types/manager-site-job'

interface Props {
  params: Promise<{ locale: string; siteId: string }>
  searchParams: Promise<{ copyFrom?: string }>
}

async function fetchJobForCopy(jobId: string, token: string): Promise<Partial<Job> | null> {
  const apiBase =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:7001/v1'
  try {
    const res = await fetch(`${apiBase}/manager/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    const src: Job = json.data
    // Return copy-safe fields — clear date/expires/slotsFilled/status
    return {
      siteId: src.siteId,
      siteName: src.siteName,
      title: src.title,
      titleVi: src.titleVi,
      description: src.description,
      descriptionVi: src.descriptionVi,
      tradeId: src.tradeId,
      tradeName: src.tradeName,
      workDate: '',
      expiresAt: undefined,
      startTime: src.startTime,
      endTime: src.endTime,
      dailyWage: src.dailyWage,
      slotsTotal: src.slotsTotal,
      benefits: src.benefits,
      requirements: src.requirements,
    }
  } catch {
    return null
  }
}

export default async function NewJobPage({ params, searchParams }: Props) {
  const { locale, siteId } = await params
  const { copyFrom } = await searchParams
  const t = await getTranslations({ locale, namespace: 'common.manager_job_form' })

  let initialData: Partial<Job> | undefined
  let isCopy = false

  if (copyFrom) {
    const cookieStore = await cookies()
    const token = cookieStore.get('gada_session')?.value ?? ''
    if (token) {
      const copied = await fetchJobForCopy(copyFrom, token)
      if (copied) {
        initialData = copied
        isCopy = true
      }
    }
  }

  const pageTitle = isCopy ? t('copy_title') : t('create_title')

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{pageTitle}</h1>
        <JobFormWrapper mode="create" siteId={siteId} locale={locale} initialData={initialData} />
      </div>
    </div>
  )
}
