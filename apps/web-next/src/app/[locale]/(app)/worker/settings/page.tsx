import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import SettingsPage from '@/components/settings/SettingsPage'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function WorkerSettingsPage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
      managerStatus={user?.managerStatus}
    >
      <SettingsPage currentLocale={locale} />
    </WorkerAccountShell>
  )
}
