import SiteDetailClient from '@/components/manager/site/SiteDetailClient'

interface Props {
  params: Promise<{ locale: string; siteId: string }>
}

export default async function SiteDetailManagerPage({ params }: Props) {
  const { locale, siteId } = await params

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-8">
        <SiteDetailClient siteId={siteId} locale={locale} />
      </div>
    </div>
  )
}
