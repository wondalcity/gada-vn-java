import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { getAuthUser } from '@/lib/auth/server'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()
  return (
    // Override --tab-bar-height: public pages have no bottom nav bar
    <div className="min-h-screen flex flex-col bg-[#F2F4F5]" style={{ ['--tab-bar-height' as string]: '0px' }}>
      <PublicHeader locale={locale} user={user} />
      <main className="flex-1">{children}</main>
      <PublicFooter locale={locale} />
    </div>
  )
}
