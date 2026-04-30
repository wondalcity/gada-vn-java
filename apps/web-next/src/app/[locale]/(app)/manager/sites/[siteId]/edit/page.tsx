import { getTranslations } from 'next-intl/server'
import SiteEditClient from '@/components/manager/site/SiteEditClient'

interface Props {
  params: Promise<{ locale: string; siteId: string }>
}

export default async function SiteEditPage({ params }: Props) {
  const { locale, siteId } = await params
  const t = await getTranslations({ locale, namespace: 'common.manager_site_form' })

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('edit_title')}</h1>
        <SiteEditClient siteId={siteId} locale={locale} />
      </div>
    </div>
  )
}
