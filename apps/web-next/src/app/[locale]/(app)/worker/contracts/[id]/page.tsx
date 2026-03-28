import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import WorkerContractDetailClient from '@/components/worker/contracts/WorkerContractDetailClient'

interface Props { params: Promise<{ locale: string; id: string }> }

export default async function WorkerContractDetailPage({ params }: Props) {
  const { locale, id } = await params
  const user = await getAuthUser()
  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <WorkerContractDetailClient contractId={id} />
    </WorkerAccountShell>
  )
}
