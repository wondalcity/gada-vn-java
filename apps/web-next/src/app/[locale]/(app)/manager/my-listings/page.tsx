import type { Metadata } from 'next'
import ManagerListingsClient from '@/components/manager/ManagerListingsClient'

export const metadata: Metadata = { title: '내 현장·공고' }

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ManagerListingsPage({ params }: Props) {
  const { locale } = await params
  return (
    <div className="min-h-screen bg-[#F2F4F5]">
      <ManagerListingsClient locale={locale} />
    </div>
  )
}
