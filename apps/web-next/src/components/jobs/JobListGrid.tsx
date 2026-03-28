import type { PublicJob } from '@/lib/api/public'
import { JobCard } from './JobCard'

interface Props {
  jobs: PublicJob[]
  locale: string
  emptyMessage?: string
  basePath?: string
}

export function JobListGrid({ jobs, locale, emptyMessage = '공고가 없습니다.', basePath }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          className="w-12 h-12 text-[#EFF1F5] mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm text-[#98A2B2]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map(job => (
        <JobCard key={job.id} job={job} locale={locale} basePath={basePath} />
      ))}
    </div>
  )
}
