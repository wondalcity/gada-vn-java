import ManagerContractClient from '@/components/manager/contracts/ManagerContractClient'

interface Props { params: Promise<{ locale: string; id: string }> }

export default async function ManagerContractDetailPage({ params }: Props) {
  const { id } = await params
  return <ManagerContractClient contractId={id} />
}
