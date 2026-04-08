import JobFormWrapper from '@/components/manager/job/JobFormWrapper'

interface Props {
  params: Promise<{ locale: string; siteId: string }>
}

export default async function NewJobPage({ params }: Props) {
  const { locale, siteId } = await params

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">새 일자리 등록</h1>
        <JobFormWrapper mode="create" siteId={siteId} locale={locale} />
      </div>
    </div>
  )
}
