import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { JobWithSite } from '@gada-vn/core';
import JobListingCard from '../../../../components/JobListingCard';

// ── Province data ─────────────────────────────────────────────────────────────

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

// ── Data fetchers ─────────────────────────────────────────────────────────────

type JobWithMeta = JobWithSite & { site_name?: string; address?: string; site_cover_image_url?: string | null };

async function getJob(id: string): Promise<JobWithMeta | null> {
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

// ── Metadata ──────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return Object.keys(PROVINCE_META).flatMap((province) =>
    ['ko', 'vi', 'en'].map((locale) => ({ locale, slug: province })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  // Province page
  const meta = PROVINCE_META[slug];
  if (meta) {
    const provinceName =
      locale === 'vi' ? meta.nameVi : locale === 'en' ? meta.nameEn : meta.nameKo;
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
          ko: `/jobs/${slug}`,
          vi: `/vi/jobs/${slug}`,
          en: `/en/jobs/${slug}`,
        },
      },
    };
  }

  // Job detail page
  const job = await getJob(slug);
  if (!job) return { title: 'Job Not Found' };

  const jobWithMeta = job as JobWithMeta;
  const siteName = jobWithMeta.site_name || job.title;
  const address = jobWithMeta.address || '';

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
        ko: `/jobs/${slug}`,
        vi: `/vi/jobs/${slug}`,
      },
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function JobsSlugPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const sp = await searchParams;

  // ── Province listing ───────────────────────────────────────────────────────
  const provinceMeta = PROVINCE_META[slug];
  if (provinceMeta) {
    const isVi = locale === 'vi';
    const provinceName =
      isVi ? provinceMeta.nameVi : locale === 'en' ? provinceMeta.nameEn : provinceMeta.nameKo;
    const code = PROVINCE_CODE[slug];
    const page = sp.page || '1';
    const { jobs, total } = await getJobsByProvince(code, page);
    const totalPages = Math.ceil(total / 18);
    const currentPage = parseInt(page);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: isVi
        ? `Việc làm xây dựng tại ${provinceMeta.nameVi}`
        : `${provinceName} 건설 일자리 목록`,
      description: isVi
        ? `Danh sách việc làm xây dựng tại ${provinceMeta.nameVi}`
        : `${provinceName} 지역 건설 현장 일자리 목록`,
      numberOfItems: total,
      itemListElement: jobs.slice(0, 10).map((job, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'JobPosting',
          title: job.title,
          hiringOrganization: {
            '@type': 'Organization',
            name: job.site_name || 'Construction Site',
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              streetAddress: job.address,
              addressCountry: 'VN',
            },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand">홈</Link>
          <span className="mx-2">/</span>
          <Link href="/jobs" className="hover:text-brand">
            {isVi ? 'Việc làm' : '일자리'}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{provinceName}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isVi
              ? `Việc làm xây dựng tại ${provinceMeta.nameVi}`
              : `${provinceName} 건설 일자리`}
          </h1>
          <p className="text-gray-500">
            {isVi
              ? `${total.toLocaleString()} vị trí tuyển dụng`
              : `총 ${total.toLocaleString()}개 일자리`}
          </p>
        </div>

        {jobs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {jobs.map((job) => (
                <JobListingCard key={job.id} job={job} locale={locale} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/jobs/${slug}?page=${p}`}
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

        <section className="mt-16 border-t pt-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            {isVi ? 'Tỉnh thành khác' : '다른 지역 일자리'}
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(PROVINCE_META)
              .filter(([s]) => s !== slug)
              .map(([s, m]) => (
                <Link
                  key={s}
                  href={`/jobs/${s}`}
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

  // ── Job detail ─────────────────────────────────────────────────────────────
  const job = await getJob(slug);
  if (!job) notFound();

  const jobWithMeta = job as JobWithMeta;

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-64 relative bg-gray-200 overflow-hidden">
          {jobWithMeta.site_cover_image_url ? (
            <Image
              src={jobWithMeta.site_cover_image_url}
              alt={jobWithMeta.site_name || job.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400 text-4xl">🏗️</span>
            </div>
          )}
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
