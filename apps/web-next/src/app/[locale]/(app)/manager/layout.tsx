import { redirect } from 'next/navigation'
import { getAuthUser } from '../../../../lib/auth/server'
import { ManagerAppBar } from './ManagerAppBar'
import ManagerNav from './ManagerNav'
import ManagerProviders from './ManagerProviders'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function ManagerLayout({ children, params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  if (!user) {
    redirect(`/api/auth/signout?locale=${locale}`)
  }

  if (!user.isManager) {
    redirect(`/${locale}/worker`)
  }

  return (
    <ManagerProviders locale={locale}>
      <div className="min-h-dvh bg-[#F2F4F5]">
        <ManagerAppBar locale={locale} user={user} />
        {/* main-content: top offset for app bar; bottom padding only on mobile */}
        <main className="main-content md:pb-0">
          {children}
        </main>
        <ManagerNav locale={locale} />
      </div>
    </ManagerProviders>
  )
}
