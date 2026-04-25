import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import JobListingCard from '../../../components/JobListingCard';
import type { JobWithSite } from '@gada-vn/core';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ province?: string; tradeId?: string; q?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'jobs' });
  return {
    title: t('title'),
    description: '베트남 전국 건설 현장 일자리 목록',
    alternates: {
      languages: {
        ko: '/jobs',
        vi: '/vi/jobs',
      },
    },
  };
}

async function getJobs(searchParams: { province?: string; tradeId?: string; q?: string; page?: string }): Promise<JobWithSite[]> {
  const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001/v1';
  const params = new URLSearchParams();
  params.set('limit', '20');
  if (searchParams.page) params.set('page', searchParams.page);
  if (searchParams.province) params.set('province', searchParams.province);
  if (searchParams.tradeId) params.set('tradeId', searchParams.tradeId);
  if (searchParams.q) params.set('q', searchParams.q);

  try {
    const res = await fetch(
      `${apiUrl}/jobs?${params.toString()}`,
      { next: { revalidate: 300, tags: ['jobs'] } },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export default async function JobsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const jobs = await getJobs(sp);
  const isVi = locale === 'vi';
  const isEn = locale === 'en';

  const emptyMsg = isVi ? 'Không có việc làm' : isEn ? 'No jobs found' : '일자리가 없습니다';

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {isVi ? 'Việc làm xây dựng' : isEn ? 'Construction Jobs' : '건설 일자리'}
      </h1>

      {sp.q && (
        <p className="text-gray-500 text-sm mb-6">
          {isVi ? `Kết quả tìm kiếm: "${sp.q}"` : isEn ? `Search results: "${sp.q}"` : `"${sp.q}" 검색 결과`}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <JobListingCard key={job.id} job={job} locale={locale} />
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl">{emptyMsg}</p>
        </div>
      )}
    </main>
  );
}
