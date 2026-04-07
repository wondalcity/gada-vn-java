import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import WorkerExperienceClient from '@/components/worker/profile/WorkerExperienceClient'

interface Props { params: Promise<{ locale: string }> }

export default async function WorkerExperiencePage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <WorkerExperienceClient locale={locale} />
    </WorkerAccountShell>
  )
}
