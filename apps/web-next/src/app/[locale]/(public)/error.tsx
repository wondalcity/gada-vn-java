'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useParams } from 'next/navigation'

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'

  useEffect(() => {
    router.replace(`/${locale}`)
  }, [locale, router])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F2F4F5] px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FDE8EE] flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#D81A48]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-lg font-bold text-[#25282A] mb-1">페이지를 불러올 수 없습니다</h1>
      <p className="text-sm text-[#98A2B2] mb-6">메인 화면으로 이동 중...</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-2xl border border-[#EFF1F5] text-sm font-medium text-[#25282A] bg-white hover:bg-[#F2F4F5] transition-colors"
        >
          다시 시도
        </button>
        <button
          onClick={() => router.replace(`/${locale}`)}
          className="px-5 py-2.5 rounded-2xl bg-[#0669F7] text-white text-sm font-medium hover:bg-[#0550C4] transition-colors"
        >
          메인으로 이동
        </button>
      </div>
    </div>
  )
}
