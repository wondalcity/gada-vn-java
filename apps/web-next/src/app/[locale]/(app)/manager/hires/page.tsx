import ManagerHiresClient from '@/components/manager/hires/ManagerHiresClient'

interface Props { params: Promise<{ locale: string }> }

export default async function ManagerHiresPage({ params }: Props) {
  await params
  return <ManagerHiresClient />
}
