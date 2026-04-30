import { getTranslations } from 'next-intl/server'
import JobEditClient from '@/components/manager/job/JobEditClient'

interface Props {
  params: Promise<{ locale: string; jobId: string }>
}

export default async function JobEditPage({ params }: Props) {
  const { locale, jobId } = await params
  const t = await getTranslations({ locale, namespace: 'common.manager_job_form' })

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('edit_title')}</h1>
        <JobEditClient jobId={jobId} locale={locale} />
      </div>
    </div>
  )
}
