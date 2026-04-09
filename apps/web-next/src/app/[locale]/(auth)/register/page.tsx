import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { RegisterForm } from '../../../../components/auth/RegisterForm'

interface Props {
  params:       Promise<{ locale: string }>
  searchParams: Promise<{ expired?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return {
    title: t('register.meta_title'),
    robots: { index: false, follow: false },
  }
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale }   = await params
  const { expired }  = await searchParams
  return <RegisterForm locale={locale} expired={expired === '1'} />
}
