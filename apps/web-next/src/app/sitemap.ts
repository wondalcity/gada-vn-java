import type { MetadataRoute } from 'next'

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

  // TODO: fetch dynamic job slugs from API for /jobs/[slug] and /sites/[slug]
  // const jobs = await fetchPublicJobs({})
  // const jobRoutes = jobs.data.flatMap(job => LOCALES.map(locale => ({ url: `${BASE_URL}/${locale}/jobs/${job.slug}`, ... })))

  return [...staticRoutes]
}
