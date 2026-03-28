import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ko', 'vi', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'always', // /ko/jobs, /vi/jobs, /en/jobs
})

export type Locale = (typeof routing.locales)[number]
