'use client'

import { GlobalLoadingBar } from '@/components/ui/GlobalLoadingBar'

interface Props {
  children: React.ReactNode
  locale: string
}

export default function ManagerProviders({ children, locale: _locale }: Props) {
  return (
    <>
      <GlobalLoadingBar />
      {children}
    </>
  )
}
