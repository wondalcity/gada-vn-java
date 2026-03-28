import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import WorkerContractsClient from '@/components/worker/contracts/WorkerContractsClient'

interface Props { params: Promise<{ locale: string }> }

export default async function WorkerContractsPage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <WorkerContractsClient />
    </WorkerAccountShell>
  )
}
