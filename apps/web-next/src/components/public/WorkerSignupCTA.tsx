import { getTranslations } from 'next-intl/server'
import { Link } from '@/components/navigation'

interface Props {
  locale: string
}

export async function WorkerSignupCTA({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'landing' })

  return (
    <section className="bg-gradient-to-r from-[#0669F7] to-[#0550C4] py-16">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white">{t('cta.title')}</h2>
        <p className="mt-3 text-base text-white/80">{t('cta.subtitle')}</p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-white text-[#0669F7] font-semibold text-sm hover:bg-[#E6F0FE] transition-colors shadow-md"
          >
            {t('cta.register')}
          </Link>
          <Link
            href="/jobs"
            className="w-full sm:w-auto px-8 py-3 rounded-full border-2 border-white text-white font-semibold text-sm hover:bg-white hover:text-[#0669F7] transition-colors"
          >
            {t('cta.view_jobs')}
          </Link>
        </div>

        <p className="mt-5 text-xs text-white/70">
          {t('cta.have_account')}{' '}
          <Link href="/login" className="underline hover:text-white transition-colors">
            {t('cta.login')}
          </Link>
        </p>
      </div>
    </section>
  )
}
