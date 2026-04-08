/**
 * Auth layout — minimal full-screen layout for login and register pages.
 *
 * Intentionally excludes PublicHeader and PublicFooter.
 * Forms handle their own branding header and use safe-area utilities.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
