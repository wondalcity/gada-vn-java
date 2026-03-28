import ApplicantListClient from '@/components/manager/applicants/ApplicantListClient'

interface Props { params: Promise<{ locale: string; jobId: string }> }

export default async function ApplicantsPage({ params }: Props) {
  const { locale, jobId } = await params
  return <ApplicantListClient jobId={jobId} locale={locale} />
}
