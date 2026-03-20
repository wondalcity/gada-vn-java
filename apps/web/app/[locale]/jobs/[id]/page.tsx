import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { JobWithSite } from '@gada-vn/core';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

async function getJob(id: string): Promise<JobWithSite | null> {
  const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001/v1';
  try {
    const res = await fetch(`${apiUrl}/jobs/${id}`, {
      next: { revalidate: 300, tags: [`job-${id}`] },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const job = await getJob(id);
  if (!job) return { title: 'Job Not Found' };

  const siteName = (job as JobWithSite & { site_name?: string }).site_name || job.title;
  const address = (job as JobWithSite & { address?: string }).address || '';

  return {
    title: `${siteName} 건설 일자리 | ₫${job.dailyWage.toLocaleString()} | GADA VN`,
    description: `${address} 위치 ${siteName}에서 건설 일자리를 모집합니다. 일 노임 ₫${job.dailyWage.toLocaleString()}`,
    openGraph: {
      title: `${siteName} 건설 일자리`,
      description: `일 노임 ₫${job.dailyWage.toLocaleString()} | ${address}`,
      type: 'website',
    },
    alternates: {
      languages: {
        ko: `/jobs/${id}`,
        vi: `/vi/jobs/${id}`,
      },
    },
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { id, locale } = await params;
  const job = await getJob(id);

  if (!job) notFound();

  const jobWithMeta = job as JobWithSite & { site_name?: string; address?: string };

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || `${jobWithMeta.site_name} 건설 일자리`,
    datePosted: job.createdAt?.toString() || new Date().toISOString(),
    validThrough: job.expiresAt?.toString() || job.workDate?.toString(),
    hiringOrganization: {
      '@type': 'Organization',
      name: jobWithMeta.site_name || 'Construction Site',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: jobWithMeta.address,
        addressCountry: 'VN',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'VND',
      value: {
        '@type': 'QuantitativeValue',
        value: job.dailyWage,
        unitText: 'DAY',
      },
    },
    employmentType: 'TEMPORARY',
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'Vietnam',
    },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Cover image placeholder */}
        <div className="h-64 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400 text-4xl">🏗️</span>
        </div>

        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {jobWithMeta.site_name || job.title}
          </h1>
          <p className="text-gray-500 mb-6">{jobWithMeta.address}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-brand-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">일 노임</p>
              <p className="text-2xl font-bold text-brand">
                ₫{job.dailyWage.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">모집 인원</p>
              <p className="text-2xl font-bold text-gray-900">
                {job.slotsFilled}/{job.slotsTotal}명
              </p>
            </div>
          </div>

          {job.description && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-2">상세 정보</h2>
              <p className="text-gray-600">{job.description}</p>
            </div>
          )}

          <div className="bg-brand rounded-xl p-5 text-white text-center">
            <p className="text-lg font-semibold mb-2">지원하려면 앱을 다운로드하세요</p>
            <p className="text-sm opacity-80 mb-4">가다 VN 앱에서 바로 지원할 수 있습니다</p>
            <div className="flex gap-3 justify-center">
              <a href="#" className="bg-white text-brand px-5 py-2 rounded-lg font-medium text-sm">
                App Store
              </a>
              <a href="#" className="bg-white text-brand px-5 py-2 rounded-lg font-medium text-sm">
                Google Play
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
