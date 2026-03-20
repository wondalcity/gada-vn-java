import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://gadavn.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001/v1';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/vi/jobs`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
  ];

  try {
    // Dynamic job pages
    const res = await fetch(`${apiUrl}/jobs?limit=1000&status=OPEN`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return staticPages;

    const json = await res.json();
    const jobs = json.data || [];

    const jobPages: MetadataRoute.Sitemap = jobs.map((job: { id: string; updatedAt?: string }) => ({
      url: `${BASE_URL}/jobs/${job.id}`,
      lastModified: job.updatedAt ? new Date(job.updatedAt) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...jobPages];
  } catch {
    return staticPages;
  }
}
