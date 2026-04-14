'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { Site } from '@/types/manager-site-job'
import StatusBadge from '@/components/manager/StatusBadge'

interface SiteCardProps {
  site: Site
  locale: string
}

export default function SiteCard({ site, locale }: SiteCardProps) {
  const t = useTranslations('manager_site_list')
  return (
    <Link href={`/manager/sites/${site.id}`} className="press-effect block">
      <div
        className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {site.coverImageUrl ? (
          <div className="h-40 overflow-hidden">
            <img
              src={site.coverImageUrl}
              alt={site.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-40 bg-[#F2F4F5] flex items-center justify-center">
            <svg
              className="w-12 h-12 text-[#DBDFE9]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-[#25282A] text-sm leading-snug">{site.name}</h3>
            <StatusBadge status={site.status} />
          </div>
          <p className="text-xs text-[#98A2B2] font-medium mb-2">{site.province}</p>
          <p className="text-xs text-[#25282A] font-semibold">{t('job_count', { count: site.jobCount })}</p>
        </div>
      </div>
    </Link>
  )
}
