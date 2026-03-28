// Re-export types for use across packages
export type Locale = 'ko' | 'vi' | 'en'
export const locales: Locale[] = ['ko', 'vi', 'en']
export const defaultLocale: Locale = 'ko'

export type Namespace =
  | 'common'
  | 'auth'
  | 'jobs'
  | 'worker'
  | 'manager'
  | 'landing'
  | 'notifications'
  | 'validation'

export const namespaces: Namespace[] = [
  'common',
  'auth',
  'jobs',
  'worker',
  'manager',
  'landing',
  'notifications',
  'validation',
]
