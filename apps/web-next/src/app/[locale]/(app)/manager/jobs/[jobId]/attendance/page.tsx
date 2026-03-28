import AttendanceManagerClient from '@/components/manager/attendance/AttendanceManagerClient'

interface Props {
  params: Promise<{ locale: string; jobId: string }>
}

export default async function AttendancePage({ params }: Props) {
  const { locale, jobId } = await params
  return <AttendanceManagerClient jobId={jobId} locale={locale} />
}
