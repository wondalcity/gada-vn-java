import { PublicHeader } from '@/components/public/PublicHeader'
import { getAuthUser } from '@/lib/auth/server'
import { fetchProvinces } from '@/lib/api/public'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params
  const [user, provinces] = await Promise.all([
    getAuthUser(),
    fetchProvinces(locale).catch(() => []),
  ])
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8FA]">
      <PublicHeader locale={locale} user={user} provinces={provinces} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
