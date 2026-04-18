'use client'

import { GlobalLoadingBar } from '@/components/ui/GlobalLoadingBar'

interface Props {
  children: React.ReactNode
  locale: string
}

export default function WorkerProviders({ children, locale: _locale }: Props) {
  return (
    <>
      <GlobalLoadingBar />
      {children}
    </>
  )
}
