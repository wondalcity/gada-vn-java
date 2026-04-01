import { redirect } from 'next/navigation'
import { getAuthUser } from '../../../lib/auth/server'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  if (!user) {
    redirect(`/api/auth/signout?locale=${locale}`)
  }

  return <>{children}</>
}
