import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_MANAGERS } from '../lib/demo-data'
import { useAdminTranslation } from '../context/LanguageContext'

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

type Status = 'PENDING' | 'APPROVED' | 'REJECTED'
interface Manager {
  id: string
  representative_name: string
  worker_full_name?: string
  company_name?: string
  site_name?: string
  business_type?: string
  phone?: string
  approval_status: Status
  created_at: string
}

const STATUS_BADGE: Record<Status, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-[#FDE8EE] text-[#D81A48]',
}

export default function Managers() {
  const { t } = useAdminTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') as Status) ?? 'PENDING'
  const page = parseInt(searchParams.get('page') ?? '1')
  const [managers, setManagers] = useState<Manager[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [flash] = useState(searchParams.get('flash') ?? '')

  const STATUS_TABS: { key: Status; labelKey: string }[] = [
    { key: 'PENDING',  labelKey: 'managers.tab_pending' },
    { key: 'APPROVED', labelKey: 'managers.tab_approved' },
    { key: 'REJECTED', labelKey: 'managers.tab_rejected' },
  ]

  const STATUS_LABEL: Record<Status, string> = {
    PENDING:  t('managers.status_pending'),
    APPROVED: t('managers.status_approved'),
    REJECTED: t('managers.status_rejected'),
  }

  function loadManagers() {
    setLoading(true)
    api.get<{ data: Manager[]; total: number }>(`/admin/managers?status=${status}&page=${page}&limit=20`)
      .then((res) => {
        const data = res.data ?? []
        if (data.length === 0) {
          const demo = DEMO_MANAGERS.filter((m) => m.approval_status === status) as unknown as Manager[]
          setManagers(demo)
          setTotal(demo.length)
          setIsDemo(true)
        } else {
          setManagers(data)
          setTotal(res.total ?? data.length)
          setIsDemo(false)
        }
      })
      .catch(() => {
        const demo = DEMO_MANAGERS.filter((m) => m.approval_status === status) as unknown as Manager[]
        setManagers(demo)
        setTotal(demo.length)
        setIsDemo(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadManagers()
  }, [status, page])

  async function handleRevoke(id: string) {
    if (!confirm(t('managers.confirm_revoke'))) return
    await api.post(`/admin/managers/${id}/revoke`)
    loadManagers()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('managers.title')}</h1>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">{t('common.demo_data')}</span>
          <span className="text-amber-600">{t('common.demo_suffix')}</span>
        </div>
      )}

      {flash === 'approved' && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 mb-6 text-sm">{t('managers.flash_approved')}</div>
      )}
      {flash === 'rejected' && (
        <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-2xl p-4 mb-6 text-sm">{t('managers.flash_rejected')}</div>
      )}

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSearchParams({ status: tab.key, page: '1' })}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              status === tab.key ? 'bg-[#0669F7] text-white' : 'bg-white text-gray-600 hover:bg-[#F2F4F5] border border-[#EFF1F5]'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : managers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">{t('managers.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {[
                  t('managers.col_name'),
                  t('managers.col_phone'),
                  t('managers.col_site'),
                  t('managers.col_status'),
                  t('managers.col_joined'),
                  '',
                ].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {managers.map((m) => (
                <tr key={m.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {m.worker_full_name ?? m.representative_name}
                    </div>
                    <div className="text-xs text-[#98A2B2] mt-0.5">{m.representative_name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatPhone(m.phone)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{m.site_name ?? '-'}</div>
                    <div className="text-xs text-[#98A2B2] mt-0.5">{m.company_name ?? ''}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE[m.approval_status]}`}>
                      {STATUS_LABEL[m.approval_status] ?? m.approval_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-3 justify-end">
                      {m.approval_status === 'APPROVED' && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleRevoke(m.id) }}
                          className="text-xs text-[#D81A48] border border-[#F4B0C0] rounded px-2 py-1 hover:bg-[#FDE8EE]"
                        >
                          {t('managers.revoke')}
                        </button>
                      )}
                      <Link to={`/managers/${m.id}`} className="text-[#0669F7] hover:underline text-sm">{t('managers.detail_arrow')}</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">{t('managers.total').replace('{n}', String(total))}</div>
    </div>
  )
}
