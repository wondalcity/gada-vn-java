/**
 * Registration page — Screen A-05
 *
 * Server component shell that renders the client RegisterForm.
 * The user is already authenticated when they land here (isNewUser=true
 * after OTP verify). The form calls POST /auth/register with the
 * gada_session cookie to complete the user profile.
 */

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { RegisterForm } from '../../../../components/auth/RegisterForm'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return {
    title: t('register.meta_title'),
    robots: { index: false, follow: false },
  }
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params
  return <RegisterForm locale={locale} />
}
