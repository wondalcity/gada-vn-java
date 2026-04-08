import JobListClient from '@/components/manager/job/JobListClient'

interface Props {
  params: Promise<{ locale: string; siteId: string }>
}

export default async function SiteJobsPage({ params }: Props) {
  const { locale, siteId } = await params

  return (
    <div className="min-h-screen bg-[#e5e7eb]">
      <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">일자리 목록</h1>
        <JobListClient siteId={siteId} locale={locale} />
      </div>
    </div>
  )
}
