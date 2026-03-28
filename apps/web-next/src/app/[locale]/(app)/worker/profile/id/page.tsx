import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import IdUploadForm from '@/components/worker/IdUploadForm'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function WorkerIdUploadPage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <IdUploadForm locale={locale} />
    </WorkerAccountShell>
  )
}
