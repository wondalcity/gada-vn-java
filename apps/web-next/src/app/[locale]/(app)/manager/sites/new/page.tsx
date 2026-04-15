import { getTranslations } from 'next-intl/server'
import SiteFormWrapper from '@/components/manager/site/SiteFormWrapper'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function NewSitePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'common.manager_site_form' })

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('create_title')}</h1>
        <SiteFormWrapper locale={locale} />
      </div>
    </div>
  )
}
