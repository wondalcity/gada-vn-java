import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import JobListingCard from '../../../components/JobListingCard';
import type { JobWithSite } from '@gada-vn/core';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ province?: string; trade?: string; page?: string }>;
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

async function getJobs(searchParams: { province?: string; page?: string }): Promise<JobWithSite[]> {
  const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001/v1';
  const page = searchParams.page || '1';
  const province = searchParams.province || '';

  try {
    const res = await fetch(
      `${apiUrl}/jobs?page=${page}${province ? `&province=${province}` : ''}&limit=20`,
      { next: { revalidate: 3600, tags: ['jobs'] } },
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

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {locale === 'vi' ? 'Việc làm xây dựng' : '건설 일자리'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <JobListingCard key={job.id} job={job} locale={locale} />
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl">일자리가 없습니다</p>
        </div>
      )}
    </main>
  );
}
