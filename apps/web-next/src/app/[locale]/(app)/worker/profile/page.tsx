import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import WorkerProfileTabs from '@/components/worker/WorkerProfileTabs'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function WorkerProfilePage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <WorkerProfileTabs locale={locale} />
    </WorkerAccountShell>
  )
}
