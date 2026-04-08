import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { getAuthUser } from '@/lib/auth/server'
import { fetchProvinces } from '@/lib/api/public'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params
  const [user, provinces] = await Promise.all([
    getAuthUser(),
    fetchProvinces(locale),
  ])
  return (
    // Override --tab-bar-height: public pages have no bottom nav bar
    <div className="min-h-screen flex flex-col bg-[#F8F8FA]" style={{ ['--tab-bar-height' as string]: '0px' }}>
      <PublicHeader locale={locale} user={user} provinces={provinces} />
      <main className="flex-1">{children}</main>
      <PublicFooter locale={locale} />
    </div>
  )
}
