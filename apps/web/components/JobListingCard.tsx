import Link from 'next/link';
import Image from 'next/image';
import type { JobWithSite } from '@gada-vn/core';

interface Props {
  job: JobWithSite & { site_name?: string; address?: string; site_cover_image_url?: string | null };
  locale: string;
}

export default function JobListingCard({ job, locale }: Props) {
  const isFull = job.slotsFilled >= job.slotsTotal;
  const workDate = job.workDate ? new Date(job.workDate).toLocaleDateString('ko-KR') : '';

  return (
    <Link href={`/${locale === 'ko' ? '' : locale + '/'}jobs/${job.id}`}>
      <article className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
        {/* Site cover image */}
        <div className="h-40 relative bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          {job.site_cover_image_url ? (
            <Image
              src={job.site_cover_image_url}
              alt={job.site_name || job.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-4xl">🏗️</span>
            </div>
          )}
        </div>

        <div className="p-5">
          <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-brand transition-colors">
            {job.site_name || job.title}
          </h3>
          <p className="text-gray-500 text-sm mb-3 truncate">{job.address}</p>

          <div className="flex items-center justify-between mb-3">
            <span className="text-brand font-bold text-xl">
              ₫{job.dailyWage.toLocaleString()}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isFull ? 'bg-gray-100 text-gray-500' : 'bg-brand-50 text-brand'
            }`}>
              {isFull ? '마감' : '모집 중'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>📅 {workDate}</span>
            <span>👷 {job.slotsFilled}/{job.slotsTotal}명</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
