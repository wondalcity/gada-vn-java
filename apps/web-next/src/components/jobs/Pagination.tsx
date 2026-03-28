import { Link } from '@/components/navigation'

interface Props {
  page: number
  totalPages: number
  basePath: string
  searchParams?: Record<string, string | undefined>
}

function buildHref(basePath: string, page: number, searchParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value)
    }
  }
  params.set('page', String(page))
  return `${basePath}?${params.toString()}`
}

export function Pagination({ page, totalPages, basePath, searchParams }: Props) {
  if (totalPages <= 1) return null

  // Build visible page range: up to 5 pages centered on current
  const half = 2
  let start = Math.max(1, page - half)
  let end = Math.min(totalPages, page + half)
  if (end - start < 4) {
    if (start === 1) end = Math.min(totalPages, start + 4)
    else start = Math.max(1, end - 4)
  }
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <nav aria-label="페이지 이동" className="flex items-center justify-center gap-1 mt-8">
      {/* Prev */}
      {page > 1 ? (
        <Link
          href={buildHref(basePath, page - 1, searchParams)}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-[#EFF1F5] bg-white text-[#25282A] hover:bg-[#EFF1F5] hover:border-[#0669F7] transition-colors"
          aria-label="이전 페이지"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      ) : (
        <span className="flex items-center justify-center w-8 h-8 rounded-md border border-[#EFF1F5] bg-[#EFF1F5] text-[#DBDFE9] cursor-not-allowed">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </span>
      )}

      {/* Page numbers */}
      {pages.map(p => (
        p === page ? (
          <span
            key={p}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-[#0669F7] text-white text-sm font-semibold"
            aria-current="page"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(basePath, p, searchParams)}
            className="flex items-center justify-center w-8 h-8 rounded-md border border-[#EFF1F5] bg-white text-[#25282A] text-sm hover:bg-[#EFF1F5] hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
          >
            {p}
          </Link>
        )
      ))}

      {/* Next */}
      {page < totalPages ? (
        <Link
          href={buildHref(basePath, page + 1, searchParams)}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-[#EFF1F5] bg-white text-[#25282A] hover:bg-[#EFF1F5] hover:border-[#0669F7] transition-colors"
          aria-label="다음 페이지"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <span className="flex items-center justify-center w-8 h-8 rounded-md border border-[#EFF1F5] bg-[#EFF1F5] text-[#DBDFE9] cursor-not-allowed">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </nav>
  )
}
