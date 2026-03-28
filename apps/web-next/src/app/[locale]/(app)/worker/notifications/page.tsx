import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import NotificationsClient from '@/components/NotificationsClient'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function WorkerNotificationsPage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <NotificationsClient />
    </WorkerAccountShell>
  )
}
