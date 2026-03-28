export interface JobPostingJsonLd {
  title: string
  description?: string
  datePosted: string
  validThrough?: string
  employmentType?: string
  hiringOrganization: { name: string; sameAs?: string }
  jobLocation: { streetAddress: string; addressLocality: string; addressCountry: string }
  baseSalary?: { currency: string; value: number; unitText: string }
}

export function buildJobPostingJsonLd(job: JobPostingJsonLd) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: job.employmentType ?? 'TEMPORARY',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.hiringOrganization.name,
      sameAs: job.hiringOrganization.sameAs,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: job.jobLocation.streetAddress,
        addressLocality: job.jobLocation.addressLocality,
        addressCountry: job.jobLocation.addressCountry ?? 'VN',
      },
    },
    baseSalary: job.baseSalary
      ? {
          '@type': 'MonetaryAmount',
          currency: job.baseSalary.currency ?? 'VND',
          value: { '@type': 'QuantitativeValue', value: job.baseSalary.value, unitText: job.baseSalary.unitText ?? 'DAY' },
        }
      : undefined,
  }
}

export function buildSiteJsonLd(site: { name: string; address: string; lat?: number; lng?: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: site.name,
    address: { '@type': 'PostalAddress', streetAddress: site.address, addressCountry: 'VN' },
    ...(site.lat && site.lng ? { geo: { '@type': 'GeoCoordinates', latitude: site.lat, longitude: site.lng } } : {}),
  }
}

export function buildJobListingJsonLd(jobs: { title: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: jobs.map((job, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: job.title,
      url: job.url,
    })),
  }
}
