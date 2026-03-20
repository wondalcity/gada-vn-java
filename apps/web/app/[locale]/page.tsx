import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { JobWithSite } from '@gada-vn/core';
import JobListingCard from '../../components/JobListingCard';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const isVi = locale === 'vi';
  return {
    title: 'GADA VN — 베트남 건설 일자리',
    description: isVi
      ? 'Tìm việc làm xây dựng lương cao tại Việt Nam. Ứng tuyển ngay qua ứng dụng GADA VN.'
      : '베트남 건설 현장 일자리를 앱 하나로. 일당 직불, 즉시 지원.',
    openGraph: { title: 'GADA VN', description: t('hero_subtitle') },
  };
}

async function getTodayJobs(
  locale: string,
): Promise<(JobWithSite & { site_name?: string; address?: string })[]> {
  const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001/v1';
  const today = new Date().toISOString().split('T')[0];
  try {
    const res = await fetch(
      `${apiUrl}/jobs/date/${today}?limit=6`,
      { next: { revalidate: 3600, tags: ['jobs-today'] } },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

const PROVINCE_LINKS = [
  { slug: 'ho-chi-minh', labelKo: '호치민', labelVi: 'TP.HCM' },
  { slug: 'hanoi', labelKo: '하노이', labelVi: 'Hà Nội' },
  { slug: 'binh-duong', labelKo: '빈즈엉', labelVi: 'Bình Dương' },
  { slug: 'dong-nai', labelKo: '동나이', labelVi: 'Đồng Nai' },
  { slug: 'da-nang', labelKo: '다낭', labelVi: 'Đà Nẵng' },
  { slug: 'vung-tau', labelKo: '붕따우', labelVi: 'Vũng Tàu' },
];

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const isVi = locale === 'vi';
  const jobs = await getTodayJobs(locale);

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-construction-dark to-construction-mid text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {isVi ? 'Việc làm xây dựng\nlương cao mỗi ngày' : t('hero_title')}
          </h1>
          <p className="text-xl text-gray-300 mb-10">
            {isVi
              ? 'Tìm việc ngay — nhận lương ngay hôm đó'
              : t('hero_subtitle')}
          </p>

          {/* Province quick links */}
          <div className="flex flex-wrap gap-3 justify-center">
            {PROVINCE_LINKS.map(({ slug, labelKo, labelVi }) => (
              <Link
                key={slug}
                href={`/jobs/${slug}`}
                className="bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                {isVi ? labelVi : labelKo}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Today's Jobs */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {isVi ? 'Việc làm hôm nay' : t('today_jobs')}
          </h2>
          <Link href="/jobs" className="text-brand font-medium hover:underline">
            {isVi ? 'Xem tất cả →' : '전체 보기 →'}
          </Link>
        </div>

        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobListingCard key={job.id} job={job} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="bg-brand-50 py-14 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { num: '5,000+', labelKo: '등록 근로자', labelVi: 'Lao động' },
            { num: '200+', labelKo: '현장 관리자', labelVi: 'Nhà thầu' },
            { num: '₫500K', labelKo: '최고 일당', labelVi: 'Lương/ngày' },
          ].map(({ num, labelKo, labelVi }) => (
            <div key={num}>
              <p className="text-3xl font-black text-brand">{num}</p>
              <p className="text-sm text-gray-500 mt-1">{isVi ? labelVi : labelKo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App Download CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {isVi ? 'Tải ứng dụng GADA VN' : t('app_download')}
          </h2>
          <p className="text-gray-600 mb-8">
            {isVi
              ? 'Ứng tuyển ngay — nhận thông báo tức thì'
              : '가다 VN 앱을 다운로드하고 바로 지원하세요'}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://apps.apple.com"
              className="bg-black text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-900 transition-colors"
            >
              📱 App Store
            </a>
            <a
              href="https://play.google.com"
              className="bg-black text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-900 transition-colors"
            >
              🤖 Google Play
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
