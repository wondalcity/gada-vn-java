'use client'

import { AuthProvider } from '@/hooks/useAuth'
import { AlertProvider } from '@/context/alert'

interface Props {
  children: React.ReactNode
  locale: string
}

export default function LocaleProviders({ children, locale }: Props) {
  return (
    <AuthProvider locale={locale}>
      <AlertProvider>
        {children}
      </AlertProvider>
    </AuthProvider>
  )
}
