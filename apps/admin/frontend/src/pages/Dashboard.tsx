import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_PENDING_MANAGERS, DEMO_WORKERS, DEMO_SITES, DEMO_JOBS } from '../lib/demo-data'
import { useAdminTranslation } from '../context/LanguageContext'

interface Manager {
  id: string
  representative_name: string
  company_name?: string
  phone?: string
  created_at: string
}

interface Result {
  data?: Manager[]
  total?: number
}

export default function Dashboard() {
  const { t } = useAdminTranslation()
  const [pending, setPending] = useState<Manager[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    api.get<Result>('/admin/managers?status=PENDING&limit=5')
      .then((res) => {
        const data = res.data ?? []
        if (data.length === 0) {
          setPending(DEMO_PENDING_MANAGERS)
          setTotal(DEMO_PENDING_MANAGERS.length)
          setIsDemo(true)
        } else {
          setPending(data)
          setTotal(res.total ?? data.length)
        }
      })
      .catch(() => {
        setPending(DEMO_PENDING_MANAGERS)
        setTotal(DEMO_PENDING_MANAGERS.length)
        setIsDemo(true)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('dashboard.title')}</h1>

      {isDemo && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">{t('common.demo_data')}</span>
          <span className="text-amber-600">{t('common.demo_suffix')}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EFF1F5]">
          <p className="text-xs text-gray-500 mb-1">{t('dashboard.pending_managers')}</p>
          <p className="text-3xl font-bold text-[#D81A48]">{total}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EFF1F5]">
          <p className="text-xs text-gray-500 mb-1">{t('dashboard.total_workers')}</p>
          <p className="text-3xl font-bold text-[#0669F7]">{isDemo ? DEMO_WORKERS.length : '-'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EFF1F5]">
          <p className="text-xs text-gray-500 mb-1">{t('dashboard.active_sites')}</p>
          <p className="text-3xl font-bold text-green-600">{isDemo ? DEMO_SITES.filter((s) => s.status === 'ACTIVE').length : '-'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EFF1F5]">
          <p className="text-xs text-gray-500 mb-1">{t('dashboard.open_jobs')}</p>
          <p className="text-3xl font-bold text-yellow-600">{isDemo ? DEMO_JOBS.filter((j) => j.status === 'OPEN').length : '-'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFF1F5]">
          <h2 className="text-base font-semibold text-gray-900">{t('dashboard.table_pending_managers')}</h2>
          <Link to="/managers" className="text-sm text-[#0669F7] hover:underline">{t('dashboard.view_all')}</Link>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : pending.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-sm">{t('dashboard.no_pending')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-[#F2F4F5]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{t('dashboard.col_name')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{t('dashboard.col_phone')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{t('dashboard.col_joined')}</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {pending.map((m) => (
                <tr key={m.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {m.company_name || m.representative_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.phone ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(m.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/managers/${m.id}`} className="text-[#0669F7] hover:underline text-sm">{t('dashboard.detail_arrow')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
