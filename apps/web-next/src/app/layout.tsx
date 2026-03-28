import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'

export const metadata: Metadata = {
  metadataBase: new URL('https://gada.vn'),
  title: {
    template: '%s | GADA VN',
    default: 'GADA VN — Kết nối việc làm xây dựng',
  },
  description: 'Nền tảng kết nối thợ xây dựng và nhà thầu hàng đầu Việt Nam.',
  robots: { index: true, follow: true },
  // Enable PWA / WebView safe area support
  viewport: 'viewport-fit=cover, width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#0669F7',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'GADA VN' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
