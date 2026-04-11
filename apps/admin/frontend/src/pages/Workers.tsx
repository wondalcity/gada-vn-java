import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_WORKERS } from '../lib/demo-data'
import { useAdminTranslation } from '../context/LanguageContext'
import { fmtDate } from '../lib/dateUtils'

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  const p = phone.trim()
  if (p.startsWith('+84')) {
    const d = p.slice(3)
    if (d.length === 9) return `+84 ${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
  }
  if (p.startsWith('+82')) {
    const d = p.slice(3)
    if (d.length >= 9) return `+82 ${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(d.length - 4)}`
  }
  return p
}

interface Worker {
  id: string
  full_name: string
  phone?: string
  current_province?: string
  id_verified: boolean
  created_at: string
  is_manager?: boolean
}

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'

const COUNTRY_CODES = [
  { code: '+84', label: '🇻🇳 +84 (VN)' },
  { code: '+82', label: '🇰🇷 +82 (KR)' },
  { code: '+1',  label: '🇺🇸 +1  (US)' },
  { code: '+81', label: '🇯🇵 +81 (JP)' },
  { code: '+86', label: '🇨🇳 +86 (CN)' },
]

function CreateWorkerModal({ onSave, onCancel }: { onSave: (phone: string, fullName: string) => Promise<void>; onCancel: () => void }) {
  const { t } = useAdminTranslation()
  const [countryCode, setCountryCode] = useState('+84')
  const [localPhone, setLocalPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const phone = countryCode + localPhone.replace(/^0/, '')
    try {
      await onSave(phone, fullName)
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(apiMsg ?? (err instanceof Error ? err.message : t('workers.modal.register_failed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">{t('workers.modal.title')}</h3>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('workers.modal.phone_label')}</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="border border-[#EFF1F5] rounded-2xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7] bg-white"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                required
                className={IN + ' flex-1'}
                value={localPhone}
                onChange={e => setLocalPhone(e.target.value)}
                placeholder={countryCode === '+84' ? '901234567' : countryCode === '+82' ? '1012345678' : ''}
                type="tel"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('workers.modal.name_label')}</label>
            <input required className={IN} value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? t('workers.modal.registering') : t('workers.modal.register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const PAGE_SIZE = 20

export default function Workers() {
  const { t, locale } = useAdminTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const [query, setQuery] = useState(search)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback((q: string, p: number) => {
    setLoading(true)
    api.get<{ data: Worker[]; total: number }>(`/admin/workers?search=${encodeURIComponent(q)}&page=${p}&limit=${PAGE_SIZE}`)
      .then((res) => {
        const data = res.data ?? []
        setWorkers(data)
        setTotal(res.total ?? data.length)
        setIsDemo(false)
      })
      .catch(() => {
        setWorkers(DEMO_WORKERS as unknown as Worker[])
        setTotal(DEMO_WORKERS.length)
        setIsDemo(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(search, page) }, [search, page, load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchParams({ search: query, page: '1' })
  }

  function goToPage(p: number) {
    setSearchParams({ search, page: String(p) })
  }

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate(phone: string, fullName: string) {
    await api.post('/admin/workers', { phone, fullName })
    setShowCreate(false)
    showMsg(t('workers.registered'))
    load(search, page)
  }

  async function handleDelete(worker: Worker) {
    if (!confirm(`"${worker.full_name}" ${t('workers.confirm_deactivate')}`)) return
    try {
      await api.delete(`/admin/workers/${worker.id}`)
      setWorkers(prev => prev.filter(w => w.id !== worker.id))
      showMsg(t('common.deactivated'))
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : t('common.delete_failed'))
    }
  }

  return (
    <div className="p-8">
      {showCreate && (
        <CreateWorkerModal
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-lg bg-[#25282A] text-white whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('workers.title')}</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors"
        >
          {t('workers.register')}
        </button>
      </div>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">{t('common.demo_data')}</span>
          <span className="text-amber-600">{t('common.demo_suffix')}</span>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('workers.search_placeholder')}
          className="flex-1 border border-[#EFF1F5] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
        />
        <button type="submit" className="bg-[#0669F7] text-white px-4 py-2 rounded-2xl text-sm font-medium">{t('common.search')}</button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : workers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">👷</p>
            <p className="text-sm">{t('workers.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-[#F2F4F5]">
                <tr>
                  {[t('workers.col_name'), t('workers.col_phone'), t('workers.col_region'), t('workers.col_id_verified'), t('workers.col_role'), t('workers.col_joined'), ''].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFF1F5]">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-[#F2F4F5]">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{w.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatPhone(w.phone)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{w.current_province ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${w.id_verified ? 'bg-green-100 text-green-700' : 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                        {w.id_verified ? t('workers.id_verified') : t('workers.id_unverified')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {w.is_manager ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-[#FDBC08]/20 text-yellow-700 font-medium">{t('workers.role_manager')}</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-[#EFF1F5] text-[#98A2B2]">{t('workers.role_worker')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{fmtDate(w.created_at, locale)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex gap-3 justify-end items-center">
                        <Link to={`/workers/${w.id}`} className="text-[#0669F7] hover:underline text-sm">{t('common.detail_arrow')}</Link>
                        {!isDemo && (
                          <button onClick={() => handleDelete(w)} className="text-[#D81A48] text-sm hover:underline">{t('common.deactivate')}</button>
                        )}
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
      {!isDemo && total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-xl text-sm border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5] disabled:opacity-40"
          >
            ‹
          </button>
          {Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i + 1)
            .filter(p => p === 1 || p === Math.ceil(total / PAGE_SIZE) || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p as number)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                    p === page
                      ? 'bg-[#0669F7] text-white border-[#0669F7] font-semibold'
                      : 'border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= Math.ceil(total / PAGE_SIZE)}
            className="px-3 py-1.5 rounded-xl text-sm border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5] disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-right">{t('workers.total').replace('{n}', String(total))}</div>
    </div>
  )
}
