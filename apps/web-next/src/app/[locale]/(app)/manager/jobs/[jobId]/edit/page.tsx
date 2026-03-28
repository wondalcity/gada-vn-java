import JobEditClient from '@/components/manager/job/JobEditClient'

interface Props {
  params: Promise<{ locale: string; jobId: string }>
}

export default async function JobEditPage({ params }: Props) {
  const { locale, jobId } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">일자리 수정</h1>
        <JobEditClient jobId={jobId} locale={locale} />
      </div>
    </div>
  )
}
