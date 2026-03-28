import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import SignaturePadForm from '@/components/worker/SignaturePadForm'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function WorkerSignaturePage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <SignaturePadForm locale={locale} />
    </WorkerAccountShell>
  )
}
