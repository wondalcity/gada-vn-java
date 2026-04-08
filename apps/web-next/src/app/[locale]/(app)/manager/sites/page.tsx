import SiteListClient from '@/components/manager/site/SiteListClient'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ManagerSitesPage({ params }: Props) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-[#e5e7eb]">
      <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">현장 관리</h1>
        <SiteListClient locale={locale} />
      </div>
    </div>
  )
}
