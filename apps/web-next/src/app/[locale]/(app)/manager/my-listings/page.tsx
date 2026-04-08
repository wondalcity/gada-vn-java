import type { Metadata } from 'next'
import ManagerListingsClient from '@/components/manager/ManagerListingsClient'

export const metadata: Metadata = { title: '내 현장·공고' }

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ManagerListingsPage({ params }: Props) {
  const { locale } = await params
  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <ManagerListingsClient locale={locale} />
    </div>
  )
}
