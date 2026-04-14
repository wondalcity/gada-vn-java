import { getTranslations } from 'next-intl/server'
import AllJobsClient from '@/components/manager/job/AllJobsClient'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ManagerJobsPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'manager' })

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-4">{t('jobs_page.title')}</h1>
        <AllJobsClient locale={locale} />
      </div>
    </div>
  )
}
