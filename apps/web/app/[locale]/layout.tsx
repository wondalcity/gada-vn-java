import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    template: '%s | GADA VN',
    default: 'GADA VN - 베트남 건설 일자리',
  },
  description: '베트남 건설 현장 일자리 매칭 플랫폼. 근처 건설 일자리를 찾고 지원하세요.',
  keywords: ['건설 일자리', '베트남', 'việc làm xây dựng', 'construction jobs vietnam'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'GADA VN',
  },
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'ko' | 'vi' | 'en')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
