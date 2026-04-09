import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from '../../../../components/auth/LoginForm'

interface Props {
  params:       Promise<{ locale: string }>
  searchParams: Promise<{ redirect?: string; expired?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return {
    title: t('login.meta_title'),
    robots: { index: false, follow: false },
  }
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale }                      = await params
  const { redirect: redirectTo, expired } = await searchParams

  return <LoginForm locale={locale} redirectTo={redirectTo} expired={expired === '1'} />
}
