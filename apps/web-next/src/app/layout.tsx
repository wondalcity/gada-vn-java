import type { Metadata, Viewport } from 'next'
import { getLocale } from 'next-intl/server'
import Script from 'next/script'
import './globals.css'

const GA_ID = 'G-ELTGZMYGJD'

export const metadata: Metadata = {
  metadataBase: new URL('https://gada.vn'),
  title: {
    template: '%s | GADA VN',
    default: 'GADA VN — Kết nối việc làm xây dựng',
  },
  description: 'Nền tảng kết nối thợ xây dựng và nhà thầu hàng đầu Việt Nam.',
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'GADA VN' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0669F7',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
