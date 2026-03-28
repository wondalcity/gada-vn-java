/**
 * Login page — Screen A-01, A-02, A-03, A-04
 *
 * Server component shell that renders the client LoginForm.
 * Handles generateMetadata and reads the `redirect` search param
 * to pass downstream for post-login navigation.
 */

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from '../../../../components/auth/LoginForm'

interface Props {
  params:       Promise<{ locale: string }>
  searchParams: Promise<{ redirect?: string }>
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
  const { locale }             = await params
  const { redirect: redirectTo } = await searchParams

  return <LoginForm locale={locale} redirectTo={redirectTo} />
}
