import { Suspense } from 'react'
import { getAuthUser } from '@/lib/auth/server'
import WorkerAccountShell from '@/components/worker/WorkerAccountShell'
import WorkerAttendanceClient from '@/components/worker/attendance/WorkerAttendanceClient'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function WorkerAttendancePage({ params }: Props) {
  const { locale } = await params
  const user = await getAuthUser()

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={user?.isManager}
    >
      <Suspense
        fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse"
              >
                <div className="h-4 bg-[#DDDDDD] rounded w-1/2 mb-2" />
                <div className="h-3 bg-[#DDDDDD] rounded w-1/3 mb-2" />
                <div className="h-3 bg-[#DDDDDD] rounded w-2/3" />
              </div>
            ))}
          </div>
        }
      >
        <WorkerAttendanceClient />
      </Suspense>
    </WorkerAccountShell>
  )
}
