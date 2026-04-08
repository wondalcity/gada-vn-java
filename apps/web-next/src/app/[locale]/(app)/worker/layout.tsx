import { getAuthUser } from '@/lib/auth/server'
import { fetchProvinces } from '@/lib/api/public'
import { WorkerAppBar } from '@/components/worker/WorkerAppBar'
import WorkerNav from './WorkerNav'
import WorkerProviders from './WorkerProviders'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function WorkerLayout({ children, params }: Props) {
  const { locale } = await params
  const [user, provinces] = await Promise.all([
    getAuthUser(),
    fetchProvinces(locale),
  ])

  return (
    <WorkerProviders locale={locale}>
      <div className="min-h-dvh bg-[#F8F8FA]">
        {/* Sticky app bar */}
        <WorkerAppBar locale={locale} user={user} provinces={provinces} />

        {/* Main content — offset by app bar; bottom padding only on mobile (tab bar) */}
        <main className="main-content md:pb-0">
          {children}
        </main>

        {/* Bottom tab bar — mobile only (md:hidden) */}
        <WorkerNav locale={locale} />
      </div>
    </WorkerProviders>
  )
}
