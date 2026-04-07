import JobDetailClient from '@/components/manager/job/JobDetailClient'

interface Props {
  params: Promise<{ locale: string; jobId: string }>
}

export default async function ManagerJobDetailPage({ params }: Props) {
  const { locale, jobId } = await params

  return (
    <div className="min-h-screen bg-[#F2F4F5]">
      <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-8">
        <JobDetailClient jobId={jobId} locale={locale} />
      </div>
    </div>
  )
}
