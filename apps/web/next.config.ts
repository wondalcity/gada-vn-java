import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_CDN_DOMAIN || 'cdn.gadavn.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@gada-vn/core'],
  },
};

export default withNextIntl(nextConfig);
