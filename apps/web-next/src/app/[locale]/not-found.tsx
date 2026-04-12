'use client'

import { useLocale } from 'next-intl'
import { Link } from '@/components/navigation'

export default function LocaleNotFound() {
  const locale = useLocale()

  const messages: Record<string, { title: string; desc: string; home: string; back: string }> = {
    ko: { title: '페이지를 찾을 수 없습니다', desc: '요청하신 페이지가 존재하지 않거나 이동되었습니다.', home: '홈으로 돌아가기', back: '이전 페이지' },
    vi: { title: 'Không tìm thấy trang', desc: 'Trang bạn yêu cầu không tồn tại hoặc đã được di chuyển.', home: 'Về trang chủ', back: 'Trang trước' },
    en: { title: 'Page not found', desc: 'The page you requested does not exist or has been moved.', home: 'Go to home', back: 'Go back' },
  }

  const m = messages[locale] ?? messages.ko

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F8FA] px-4 text-center">
      <p className="text-6xl font-black text-neutral-200">404</p>
      <h1 className="mt-4 text-xl font-bold text-neutral-800">{m.title}</h1>
      <p className="mt-2 text-sm text-neutral-500">{m.desc}</p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          {m.back}
        </button>
        <Link
          href="/"
          className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          {m.home}
        </Link>
      </div>
    </div>
  )
}
