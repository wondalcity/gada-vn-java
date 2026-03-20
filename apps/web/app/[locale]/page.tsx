import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    title: 'GADA VN',
    description: t('hero_subtitle'),
  };
}

export default function HomePage() {
  const t = useTranslations();

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-construction-dark to-construction-mid text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('home.hero_title')}
          </h1>
          <p className="text-xl text-gray-300 mb-10">
            {t('home.hero_subtitle')}
          </p>

          <div className="flex gap-3 max-w-xl mx-auto">
            <input
              type="text"
              placeholder={t('home.search_placeholder')}
              className="flex-1 px-4 py-3 rounded-xl text-gray-900 text-base outline-none"
            />
            <button className="bg-brand hover:bg-brand-600 px-6 py-3 rounded-xl font-semibold transition-colors">
              {t('home.search_button')}
            </button>
          </div>
        </div>
      </section>

      {/* Today's Jobs CTA */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{t('home.today_jobs')}</h2>
          <Link href="/jobs" className="text-brand font-medium hover:underline">
            전체 보기 →
          </Link>
        </div>

        {/* Placeholder — replaced by server-fetched JobCard list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      </section>

      {/* App Download CTA */}
      <section className="bg-brand-50 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('home.app_download')}
          </h2>
          <p className="text-gray-600 mb-8">가다 VN 앱을 다운로드하고 바로 지원하세요</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="#" className="bg-black text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2">
              📱 App Store
            </a>
            <a href="#" className="bg-black text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2">
              🤖 Google Play
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
