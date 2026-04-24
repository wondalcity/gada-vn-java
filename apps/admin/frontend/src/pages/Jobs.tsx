import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAdminTranslation } from '../context/LanguageContext'
import { fmtDateTime } from '../lib/dateUtils'

interface Job {
  id: string
  title: string
  site_name?: string
  work_date?: string
  daily_wage: number
  slots_total: number
  slots_filled?: number
  status: string
  created_at?: string
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  FILLED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-[#EFF1F5] text-[#98A2B2]',
  COMPLETED: 'bg-purple-100 text-purple-700',
}

const LIMIT_OPTIONS = [10, 30, 50]

export default function Jobs() {
  const { t } = useAdminTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const search = searchParams.get('search') ?? ''
  const [query, setQuery] = useState(search)
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const flash = searchParams.get('flash') ?? ''

  const STATUS_TABS = [
    { key: '', label: t('jobs.tab_all') },
    { key: 'OPEN', label: t('jobs.tab_open') },
    { key: 'FILLED', label: t('jobs.tab_filled') },
    { key: 'CANCELLED', label: t('jobs.tab_cancelled') },
  ]

  const load = useCallback((s: string, q: string, p: number, l: number) => {
    setLoading(true)
    api.get<{ data: Job[]; total: number }>(`/admin/jobs?status=${s}&search=${encodeURIComponent(q)}&page=${p}&limit=${l}`)
      .then((res) => {
        const data = res.data ?? []
        setJobs(data)
        setTotal(res.total ?? data.length)
      })
      .catch(() => {
        setJobs([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(status, search, page, limit) }, [status, search, page, limit, load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchParams({ status, search: query, page: '1', limit: String(limit) })
  }

  function goToPage(p: number) {
    setSearchParams({ status, search, page: String(p), limit: String(limit) })
  }

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

      {flash === 'created' && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm">{t('jobs.flash_created')}</div>}
      {flash === 'updated' && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm">{t('jobs.flash_updated')}</div>}
      {flash === 'deleted' && <div className="bg-[#F2F4F5] border border-[#EFF1F5] text-gray-600 rounded-2xl p-3 mb-4 text-sm">{t('jobs.flash_deleted')}</div>}

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setSearchParams({ status: tab.key, search, page: '1', limit: String(limit) })}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${status === tab.key ? 'bg-[#0669F7] text-white' : 'bg-white text-gray-600 hover:bg-[#F2F4F5] border border-[#EFF1F5]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('jobs.search_placeholder')}
          className="flex-1 border border-[#EFF1F5] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
        />
        <button type="submit" className="bg-[#0669F7] text-white px-4 py-2 rounded-2xl text-sm font-medium">{t('common.search')}</button>
        <select
          value={limit}
          onChange={(e) => setSearchParams({ status, search, page: '1', limit: e.target.value })}
          className="border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7] bg-white"
        >
          {LIMIT_OPTIONS.map(n => <option key={n} value={n}>{n}{t('common.per_page')}</option>)}
        </select>
      </form>

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
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {[t('jobs.col_title'), t('jobs.col_site'), t('jobs.col_work_date'), t('jobs.col_wage'), t('jobs.col_slots'), t('jobs.col_status'), t('common.created_at'), ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    <Link to={`/jobs/${j.id}`} className="hover:text-[#0669F7] hover:underline">{j.title}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{j.site_name ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{j.work_date ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-[#0669F7] font-medium whitespace-nowrap">₫{Number(j.daily_wage).toLocaleString('ko-KR')}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <span className={`font-medium ${
                      (j.slots_filled ?? 0) > j.slots_total
                        ? 'text-[#ED1C24]'
                        : (j.slots_filled ?? 0) >= j.slots_total
                          ? 'text-[#F97316]'
                          : 'text-gray-500'
                    }`}>
                      {t('jobs.slots_applied')} {j.slots_filled ?? 0}{t('jobs.slots_suffix')} / {t('jobs.slots_needed')} {j.slots_total}{t('jobs.slots_suffix')}
                      {(j.slots_filled ?? 0) > j.slots_total && (
                        <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-[#FFDCE0] text-[#ED1C24]">{t('jobs.slots_over_badge')}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE[j.status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                      {getStatusLabel(j.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{fmtDateTime(j.created_at)}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
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
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
            className="px-3 py-1.5 rounded-xl text-sm border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5] disabled:opacity-40">‹</button>
          {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
            .filter(p => p === 1 || p === Math.ceil(total / limit) || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
              ) : (
                <button key={p} onClick={() => goToPage(p as number)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${p === page ? 'bg-[#0669F7] text-white border-[#0669F7] font-semibold' : 'border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]'}`}>
                  {p}
                </button>
              )
            )}
          <button onClick={() => goToPage(page + 1)} disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1.5 rounded-xl text-sm border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5] disabled:opacity-40">›</button>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-right">{t('jobs.total').replace('{n}', String(total))}</div>
    </div>
  )
}
