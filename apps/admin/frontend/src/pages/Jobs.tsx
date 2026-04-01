import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_JOBS } from '../lib/demo-data'
import { useAdminTranslation } from '../context/LanguageContext'

interface Job {
  id: string
  title: string
  site_name?: string
  work_date?: string
  daily_wage: number
  slots_total: number
  slots_filled?: number
  status: string
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  FILLED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-[#EFF1F5] text-[#98A2B2]',
  COMPLETED: 'bg-purple-100 text-purple-700',
}

export default function Jobs() {
  const { t } = useAdminTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const flash = searchParams.get('flash') ?? ''

  const STATUS_TABS = [
    { key: '', label: t('jobs.tab_all') },
    { key: 'OPEN', label: t('jobs.tab_open') },
    { key: 'FILLED', label: t('jobs.tab_filled') },
    { key: 'CANCELLED', label: t('jobs.tab_cancelled') },
  ]

  useEffect(() => {
    setLoading(true)
    api.get<{ data: Job[]; total: number }>(`/admin/jobs?status=${status}&page=${page}&limit=20`)
      .then((res) => {
        const data = res.data ?? []
        if (data.length === 0) {
          const demo = (status ? DEMO_JOBS.filter((j) => j.status === status) : DEMO_JOBS) as unknown as Job[]
          setJobs(demo)
          setTotal(demo.length)
          setIsDemo(true)
        } else {
          setJobs(data)
          setTotal(res.total ?? data.length)
          setIsDemo(false)
        }
      })
      .catch(() => {
        const demo = (status ? DEMO_JOBS.filter((j) => j.status === status) : DEMO_JOBS) as unknown as Job[]
        setJobs(demo)
        setTotal(demo.length)
        setIsDemo(true)
      })
      .finally(() => setLoading(false))
  }, [status, page])

  async function deleteJob(id: string) {
    if (!confirm(t('jobs.confirm_cancel'))) return
    await api.delete(`/admin/jobs/${id}`)
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }

  function getStatusLabel(s: string) {
    if (s === 'OPEN') return t('jobs.status_open')
    if (s === 'FILLED') return t('jobs.status_filled')
    if (s === 'CANCELLED') return t('jobs.status_cancelled')
    return s
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('jobs.title')}</h1>
        <Link to="/jobs/new" className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors">
          {t('jobs.new')}
        </Link>
      </div>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">{t('common.demo_data')}</span>
          <span className="text-amber-600">{t('common.demo_suffix')}</span>
        </div>
      )}

      {flash === 'created' && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm">{t('jobs.flash_created')}</div>}
      {flash === 'updated' && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm">{t('jobs.flash_updated')}</div>}
      {flash === 'deleted' && <div className="bg-[#F2F4F5] border border-[#EFF1F5] text-gray-600 rounded-2xl p-3 mb-4 text-sm">{t('jobs.flash_deleted')}</div>}

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setSearchParams({ status: tab.key, page: '1' })}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${status === tab.key ? 'bg-[#0669F7] text-white' : 'bg-white text-gray-600 hover:bg-[#F2F4F5] border border-[#EFF1F5]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏗️</p>
            <p className="text-sm mb-4">{t('jobs.empty')}</p>
            <Link to="/jobs/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0669F7] text-white text-sm font-medium rounded-2xl">{t('jobs.first_register')}</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {[t('jobs.col_title'), t('jobs.col_site'), t('jobs.col_work_date'), t('jobs.col_wage'), t('jobs.col_slots'), t('jobs.col_status'), ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <Link to={`/jobs/${j.id}`} className="hover:text-[#0669F7] hover:underline">{j.title}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{j.site_name ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{j.work_date ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-[#0669F7] font-medium">₫{Number(j.daily_wage).toLocaleString('ko-KR')}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{j.slots_filled ?? 0}/{j.slots_total}{t('jobs.slots_suffix')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE[j.status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                      {getStatusLabel(j.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <Link to={`/jobs/${j.id}`} className="text-[#0669F7] hover:underline text-sm">{t('common.detail')}</Link>
                      <Link to={`/jobs/${j.id}/edit`} className="text-gray-400 hover:text-gray-700 text-sm">{t('common.edit')}</Link>
                      <button onClick={() => deleteJob(j.id)} className="text-[#D81A48] hover:text-[#D81A48] text-sm">{t('common.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">{t('jobs.total').replace('{n}', String(total))}</div>
    </div>
  )
}
