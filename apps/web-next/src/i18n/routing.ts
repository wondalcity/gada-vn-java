import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ko', 'vi', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'always', // /ko/jobs, /vi/jobs, /en/jobs
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 60 * 60 * 24 * 365 },
})

export type Locale = (typeof routing.locales)[number]
