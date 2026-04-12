import Link from 'next/link'

// Root-level 404: shown for paths completely outside the locale routing
// (e.g., /unknown-path with no locale prefix)
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F8FA] px-4 text-center">
      <p className="text-6xl font-black text-neutral-200">404</p>
      <h1 className="mt-4 text-xl font-bold text-neutral-800">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-neutral-500">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/ko"
          className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          한국어
        </Link>
        <Link
          href="/vi"
          className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          Tiếng Việt
        </Link>
      </div>
    </div>
  )
}
