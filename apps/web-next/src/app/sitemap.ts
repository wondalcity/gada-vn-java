import type { MetadataRoute } from 'next'
import { fetchPublicJobs } from '@/lib/api/public'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gada.vn'
const LOCALES = ['ko', 'vi', 'en']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['/', '/jobs'].flatMap((route) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}${route === '/' ? '' : route}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: route === '/' ? 1.0 : 0.9,
    })),
  )

  // Fetch up to 500 open jobs for dynamic routes
  const { jobs } = await fetchPublicJobs({ page: 1, statusFilter: 'OPEN' }).catch(() => ({ jobs: [] }))

  const jobRoutes = jobs.flatMap((job) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/jobs/${job.slug}`,
      lastModified: job.publishedAt ? new Date(job.publishedAt) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  )

  // Derive unique site slugs from jobs
  const siteSlugsSeen = new Set<string>()
  const siteRoutes = jobs
    .filter((job) => {
      if (siteSlugsSeen.has(job.siteSlug)) return false
      siteSlugsSeen.add(job.siteSlug)
      return true
    })
    .flatMap((job) =>
      LOCALES.map((locale) => ({
        url: `${BASE_URL}/${locale}/sites/${job.siteSlug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    )

  return [...staticRoutes, ...jobRoutes, ...siteRoutes]
}
