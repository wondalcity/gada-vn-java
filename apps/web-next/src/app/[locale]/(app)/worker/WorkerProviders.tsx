'use client'

import { AuthProvider } from '@/hooks/useAuth'
import { GlobalLoadingBar } from '@/components/ui/GlobalLoadingBar'

interface Props {
  children: React.ReactNode
  locale: string
}

export default function WorkerProviders({ children, locale }: Props) {
  return (
    <AuthProvider locale={locale}>
      <GlobalLoadingBar />
      {children}
    </AuthProvider>
  )
}
