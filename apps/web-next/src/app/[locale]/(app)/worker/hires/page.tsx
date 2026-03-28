import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import WorkerHiresClient from '@/components/worker/hires/WorkerHiresClient'

interface Props { params: Promise<{ locale: string }> }

export default async function WorkerHiresPage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <WorkerHiresClient />
    </WorkerAccountShell>
  )
}
