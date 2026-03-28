import HireDetailClient from '@/components/manager/hires/HireDetailClient'

interface Props {
  params: Promise<{ locale: string; hireId: string }>
}

export default async function HireDetailPage({ params }: Props) {
  const { hireId } = await params

  return (
    <div className="max-w-[1760px] mx-auto px-4 pt-6 pb-10">
      <HireDetailClient hireId={hireId} />
    </div>
  )
}
