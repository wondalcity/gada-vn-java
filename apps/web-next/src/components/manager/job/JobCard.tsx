'use client'

import * as React from 'react'
import Link from 'next/link'
import type { Job } from '@/types/manager-site-job'
import StatusBadge from '@/components/manager/StatusBadge'

interface JobCardProps {
  job: Job
  locale: string
  showSite?: boolean
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(dateStr))
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + ' ₫'
}

export default function JobCard({ job, locale, showSite = false }: JobCardProps) {
  const fillPercent = job.slotsTotal > 0 ? Math.round((job.slotsFilled / job.slotsTotal) * 100) : 0

  const benefits = [
    { key: 'meals', label: '식사', emoji: '🍚' },
    { key: 'transport', label: '교통', emoji: '🚌' },
    { key: 'accommodation', label: '숙박', emoji: '🏠' },
    { key: 'insurance', label: '보험', emoji: '🛡️' },
  ] as const

  const activeBenefits = benefits.filter((b) => job.benefits[b.key])

  return (
    <Link href={`/${locale}/manager/jobs/${job.id}`} className="press-effect block group">
      <div
        className="bg-white rounded-2xl p-4 hover:shadow-lg transition-all"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {showSite && (
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3 h-3 text-[#98A2B2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs text-[#98A2B2] font-medium truncate">{job.siteName}</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-[#25282A] text-sm leading-snug group-hover:text-[#0669F7] transition-colors">
            {job.title}
          </h3>
          <StatusBadge status={job.status} />
        </div>

        <p className="text-xs text-[#98A2B2] font-medium mb-1">{formatDate(job.workDate)}</p>
        <p className="text-sm font-bold text-[#0669F7] mb-3">{formatVND(job.dailyWage)}</p>

        {/* Slots progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#98A2B2] font-medium">
              {job.slotsFilled}/{job.slotsTotal}명 고용됨
            </span>
            <span className="text-[#25282A] font-bold">{fillPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#EFF1F5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0669F7] rounded-full transition-all"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        {/* Benefits */}
        {activeBenefits.length > 0 && (
          <div className="flex gap-1.5">
            {activeBenefits.map((b) => (
              <span
                key={b.key}
                className="text-xs px-2 py-0.5 bg-[#EFF1F5] rounded-full text-[#98A2B2] font-medium"
                title={b.label}
              >
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
