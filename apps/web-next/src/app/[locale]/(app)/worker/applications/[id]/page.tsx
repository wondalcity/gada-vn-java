import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import WorkerApplicationDetailClient from '@/components/worker/applications/WorkerApplicationDetailClient'

interface Props { params: Promise<{ locale: string; id: string }> }

export default async function WorkerApplicationDetailPage({ params }: Props) {
  const { locale, id } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <WorkerApplicationDetailClient id={id} locale={locale} />
    </WorkerAccountShell>
  )
}
