'use client'

import { AuthProvider } from '@/hooks/useAuth'

interface Props {
  children: React.ReactNode
  locale: string
}

export default function ManagerProviders({ children, locale }: Props) {
  return <AuthProvider locale={locale}>{children}</AuthProvider>
}
