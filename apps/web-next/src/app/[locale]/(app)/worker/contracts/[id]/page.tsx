import WorkerContractDetailClient from '@/components/worker/contracts/WorkerContractDetailClient'

interface Props { params: Promise<{ locale: string; id: string }> }

export default async function WorkerContractDetailPage({ params }: Props) {
  const { id } = await params
  return <WorkerContractDetailClient contractId={id} />
}
