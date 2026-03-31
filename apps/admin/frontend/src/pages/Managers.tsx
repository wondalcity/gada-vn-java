import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_MANAGERS } from '../lib/demo-data'

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

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: 'PENDING', label: '대기 중' },
  { key: 'APPROVED', label: '승인됨' },
  { key: 'REJECTED', label: '거부됨' },
]

const STATUS_BADGE: Record<Status, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-[#FDE8EE] text-[#D81A48]',
}

export default function Managers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') as Status) ?? 'PENDING'
  const page = parseInt(searchParams.get('page') ?? '1')
  const [managers, setManagers] = useState<Manager[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [flash] = useState(searchParams.get('flash') ?? '')

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
    if (!confirm('이 관리자의 권한을 해제하시겠습니까?')) return
    await api.post(`/admin/managers/${id}/revoke`)
    loadManagers()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">관리자 승인</h1>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— API 연결 후 실제 데이터가 표시됩니다</span>
        </div>
      )}

      {flash === 'approved' && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 mb-6 text-sm">✅ 관리자가 승인되었습니다.</div>
      )}
      {flash === 'rejected' && (
        <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-2xl p-4 mb-6 text-sm">❌ 관리자 신청이 거부되었습니다.</div>
      )}

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearchParams({ status: t.key, page: '1' })}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              status === t.key ? 'bg-[#0669F7] text-white' : 'bg-white text-gray-600 hover:bg-[#F2F4F5] border border-[#EFF1F5]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : managers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">해당하는 관리자가 없습니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {['근로자 이름', '전화번호', '현장명', '상태', '가입일', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
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
                      {STATUS_TABS.find((t) => t.key === m.approval_status)?.label ?? m.approval_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(m.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-3 justify-end">
                      {m.approval_status === 'APPROVED' && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleRevoke(m.id) }}
                          className="text-xs text-[#D81A48] border border-[#F4B0C0] rounded px-2 py-1 hover:bg-[#FDE8EE]"
                        >
                          권한 해제
                        </button>
                      )}
                      <Link to={`/managers/${m.id}`} className="text-[#0669F7] hover:underline text-sm">상세 →</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">총 {total}명</div>
    </div>
  )
}
