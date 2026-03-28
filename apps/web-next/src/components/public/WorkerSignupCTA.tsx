import { Link } from '@/components/navigation'

interface Props {
  title?: string
  subtitle?: string
}

export function WorkerSignupCTA({
  title = '지금 바로 구직을 시작하세요',
  subtitle = 'GADA VN에 가입하고 베트남 전역의 건설 일자리를 찾아보세요',
}: Props) {
  return (
    <section className="bg-gradient-to-r from-[#0669F7] to-[#0550C4] py-16">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
        <p className="mt-3 text-base text-blue-100">{subtitle}</p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-white text-[#0669F7] font-semibold text-sm hover:bg-blue-50 transition-colors shadow-md"
          >
            무료 회원가입
          </Link>
          <Link
            href="/jobs"
            className="w-full sm:w-auto px-8 py-3 rounded-full border-2 border-white text-white font-semibold text-sm hover:bg-white hover:text-[#0669F7] transition-colors"
          >
            공고 보기
          </Link>
        </div>

        <p className="mt-5 text-xs text-blue-200">
          이미 계정이 있나요?{' '}
          <Link href="/login" className="underline hover:text-white transition-colors">
            로그인
          </Link>
        </p>
      </div>
    </section>
  )
}
