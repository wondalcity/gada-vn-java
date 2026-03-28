import ManagerContractsClient from '@/components/manager/contracts/ManagerContractsClient'

interface Props { params: Promise<{ locale: string }> }

export default async function ManagerContractsPage({ params }: Props) {
  await params
  return <ManagerContractsClient />
}
