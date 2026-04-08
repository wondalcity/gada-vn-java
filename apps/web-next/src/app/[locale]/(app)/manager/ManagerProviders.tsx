'use client'

import { AuthProvider } from '@/hooks/useAuth'
import { GlobalLoadingBar } from '@/components/ui/GlobalLoadingBar'

interface Props {
  children: React.ReactNode
  locale: string
}

export default function ManagerProviders({ children, locale }: Props) {
  return (
    <AuthProvider locale={locale}>
      <GlobalLoadingBar />
      {children}
    </AuthProvider>
  )
}
