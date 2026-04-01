import SettingsPage from '@/components/settings/SettingsPage'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ManagerSettingsPage({ params }: Props) {
  const { locale } = await params
  return (
    <div className="max-w-lg md:max-w-3xl mx-auto px-4">
      <SettingsPage currentLocale={locale} />
    </div>
  )
}
