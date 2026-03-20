import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { JobWithSite } from '@gada-vn/core';
import JobListingCard from '../../../../components/JobListingCard';

// Province metadata for SEO
const PROVINCE_META: Record<string, { nameKo: string; nameVi: string; nameEn: string }> = {
  hanoi: { nameKo: '하노이', nameVi: 'Hà Nội', nameEn: 'Hanoi' },
  'ho-chi-minh': { nameKo: '호치민', nameVi: 'Hồ Chí Minh', nameEn: 'Ho Chi Minh City' },
  'da-nang': { nameKo: '다낭', nameVi: 'Đà Nẵng', nameEn: 'Da Nang' },
  'hai-phong': { nameKo: '하이퐁', nameVi: 'Hải Phòng', nameEn: 'Hai Phong' },
  'can-tho': { nameKo: '껀터', nameVi: 'Cần Thơ', nameEn: 'Can Tho' },
  'vung-tau': { nameKo: '붕따우', nameVi: 'Bà Rịa - Vũng Tàu', nameEn: 'Ba Ria - Vung Tau' },
  'binh-duong': { nameKo: '빈즈엉', nameVi: 'Bình Dương', nameEn: 'Binh Duong' },
  'dong-nai': { nameKo: '동나이', nameVi: 'Đồng Nai', nameEn: 'Dong Nai' },
  'long-an': { nameKo: '롱안', nameVi: 'Long An', nameEn: 'Long An' },
  'nha-trang': { nameKo: '나트랑', nameVi: 'Khánh Hòa', nameEn: 'Nha Trang' },
};

// Map province slug to API province code
const PROVINCE_CODE: Record<string, string> = {
  hanoi: 'HN',
  'ho-chi-minh': 'HCM',
  'da-nang': 'DN',
  'hai-phong': 'HP',
  'can-tho': 'CT',
  'vung-tau': 'BR-VT',
  'binh-duong': 'BD',
  'dong-nai': 'DN-T',
  'long-an': 'LA',
  'nha-trang': 'KH',
};

interface Props {
  params: Promise<{ locale: string; province: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function getJobsByProvince(
  provinceCode: string,
  page: string,
): Promise<{ jobs: (JobWithSite & { site_name?: string; address?: string })[]; total: number }> {
  const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001/v1';
  try {
    const res = await fetch(
      `${apiUrl}/jobs?province=${provinceCode}&page=${page}&limit=18`,
      { next: { revalidate: 3600, tags: [`jobs-province-${provinceCode}`] } },
    );
    if (!res.ok) return { jobs: [], total: 0 };
    const json = await res.json();
    return { jobs: json.data || [], total: json.total || 0 };
  } catch {
    return { jobs: [], total: 0 };
  }
}

export async function generateStaticParams() {
  return Object.keys(PROVINCE_META).flatMap((province) =>
    ['ko', 'vi', 'en'].map((locale) => ({ locale, province })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, province } = await params;
  const meta = PROVINCE_META[province];
  if (!meta) return { title: 'Not Found' };

  const provinceName = locale === 'vi' ? meta.nameVi : locale === 'en' ? meta.nameEn : meta.nameKo;
  const isVi = locale === 'vi';

  return {
    title: isVi
      ? `Việc làm xây dựng ${meta.nameVi} | GADA VN`
      : `${provinceName} 건설 일자리 | GADA VN`,
    description: isVi
      ? `Tìm việc làm xây dựng tại ${meta.nameVi}. Lương ngày hấp dẫn, nhiều vị trí tuyển dụng.`
      : `${provinceName} 건설 현장 일자리를 찾아보세요. 일당 최고 ₫500,000 이상, 즉시 지원 가능.`,
    openGraph: {
      title: isVi ? `Việc làm xây dựng ${meta.nameVi}` : `${provinceName} 건설 일자리`,
      description: isVi
        ? `Tìm việc làm xây dựng tại ${meta.nameVi}`
        : `${provinceName} 건설 일자리 검색`,
      type: 'website',
    },
    alternates: {
      languages: {
        ko: `/jobs/${province}`,
        vi: `/vi/jobs/${province}`,
        en: `/en/jobs/${province}`,
      },
    },
  };
}

export default async function ProvinceJobsPage({ params, searchParams }: Props) {
  const { locale, province } = await params;
  const sp = await searchParams;
  const meta = PROVINCE_META[province];

  if (!meta) notFound();

  const code = PROVINCE_CODE[province];
  const page = sp.page || '1';
  const { jobs, total } = await getJobsByProvince(code, page);
  const isVi = locale === 'vi';

  const provinceName = isVi ? meta.nameVi : locale === 'en' ? meta.nameEn : meta.nameKo;
  const totalPages = Math.ceil(total / 18);
  const currentPage = parseInt(page);

  // JSON-LD for province landing page
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isVi
      ? `Việc làm xây dựng tại ${meta.nameVi}`
      : `${provinceName} 건설 일자리 목록`,
    description: isVi
      ? `Danh sách việc làm xây dựng tại ${meta.nameVi}`
      : `${provinceName} 지역 건설 현장 일자리 목록`,
    numberOfItems: total,
    itemListElement: jobs.slice(0, 10).map((job, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'JobPosting',
        title: job.title,
        hiringOrganization: { '@type': 'Organization', name: job.site_name || 'Construction Site' },
        jobLocation: {
          '@type': 'Place',
          address: { '@type': 'PostalAddress', streetAddress: job.address, addressCountry: 'VN' },
        },
        baseSalary: {
          '@type': 'MonetaryAmount',
          currency: 'VND',
          value: { '@type': 'QuantitativeValue', value: job.dailyWage, unitText: 'DAY' },
        },
      },
    })),
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-brand">홈</Link>
        <span className="mx-2">/</span>
        <Link href="/jobs" className="hover:text-brand">
          {isVi ? 'Việc làm' : '일자리'}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{provinceName}</span>
      </nav>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isVi
            ? `Việc làm xây dựng tại ${meta.nameVi}`
            : `${provinceName} 건설 일자리`}
        </h1>
        <p className="text-gray-500">
          {isVi
            ? `${total.toLocaleString()} vị trí tuyển dụng`
            : `총 ${total.toLocaleString()}개 일자리`}
        </p>
      </div>

      {/* Job grid */}
      {jobs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {jobs.map((job) => (
              <JobListingCard key={job.id} job={job} locale={locale} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/jobs/${province}?page=${p}`}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl font-medium text-sm ${
                    p === currentPage
                      ? 'bg-brand text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🏗️</p>
          <p className="text-xl font-medium">
            {isVi ? 'Chưa có việc làm tại đây' : '이 지역의 일자리가 없습니다'}
          </p>
          <Link href="/jobs" className="text-brand hover:underline mt-4 inline-block">
            {isVi ? 'Xem tất cả việc làm →' : '전체 일자리 보기 →'}
          </Link>
        </div>
      )}

      {/* Province links — internal linking for SEO */}
      <section className="mt-16 border-t pt-10">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          {isVi ? 'Tỉnh thành khác' : '다른 지역 일자리'}
        </h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(PROVINCE_META)
            .filter(([slug]) => slug !== province)
            .map(([slug, m]) => (
              <Link
                key={slug}
                href={`/jobs/${slug}`}
                className="px-4 py-2 bg-gray-100 hover:bg-brand-50 hover:text-brand rounded-xl text-sm text-gray-600 transition-colors"
              >
                {isVi ? m.nameVi : locale === 'en' ? m.nameEn : m.nameKo}
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
