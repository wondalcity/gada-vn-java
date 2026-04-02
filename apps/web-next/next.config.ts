import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker deployment
  transpilePackages: ['@gada/ui', '@gada/core', '@gada/i18n', '@gada/types'],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com', // S3 presigned URLs
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net', // CloudFront CDN
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // dev dummy images
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos', // dev dummy images
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos', // picsum CDN
      },
    ],
  },
}

export default withNextIntl(nextConfig)
