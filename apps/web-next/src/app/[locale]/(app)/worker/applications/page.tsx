import { getAuthUser } from '../../../../../lib/auth/server'
import WorkerAccountShell from '../../../../../components/worker/WorkerAccountShell'
import WorkerApplicationsClient from '@/components/worker/applications/WorkerApplicationsClient'

interface Props { params: Promise<{ locale: string }> }

export default async function WorkerApplicationsPage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <WorkerApplicationsClient />
    </WorkerAccountShell>
  )
}
