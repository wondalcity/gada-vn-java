import { getTranslations } from 'next-intl/server'
import SiteListClient from '@/components/manager/site/SiteListClient'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ManagerSitesPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'manager' })

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('sites_page.title')}</h1>
        <SiteListClient locale={locale} />
      </div>
    </div>
  )
}
