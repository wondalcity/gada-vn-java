import ManagerApplicationWizard from '@/components/manager/ManagerApplicationWizard'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ManagerProfilePage({ params }: Props) {
  const { locale } = await params
  return <ManagerApplicationWizard locale={locale} />
}
