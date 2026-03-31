import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_WORKERS } from '../lib/demo-data'

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

function CreateWorkerModal({ onSave, onCancel }: { onSave: (phone: string, fullName: string) => Promise<void>; onCancel: () => void }) {
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(phone, fullName)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '등록 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">근로자 등록</h3>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">전화번호 * (베트남 형식: +84...)</label>
            <input required className={IN} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+84901234567" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">이름 *</label>
            <input required className={IN} value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">취소</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Workers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const [query, setQuery] = useState(search)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback((q: string) => {
    setLoading(true)
    api.get<{ data: Worker[]; total: number }>(`/admin/workers?search=${encodeURIComponent(q)}&limit=20`)
      .then((res) => {
        const data = res.data ?? []
        if (data.length === 0) {
          const filtered = q
            ? DEMO_WORKERS.filter((w) =>
                w.full_name.toLowerCase().includes(q.toLowerCase()) ||
                (w.phone ?? '').includes(q)
              )
            : DEMO_WORKERS
          setWorkers(filtered as unknown as Worker[])
          setTotal(filtered.length)
          setIsDemo(true)
        } else {
          setWorkers(data)
          setTotal(res.total ?? data.length)
          setIsDemo(false)
        }
      })
      .catch(() => {
        setWorkers(DEMO_WORKERS as unknown as Worker[])
        setTotal(DEMO_WORKERS.length)
        setIsDemo(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(search) }, [search, load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchParams({ search: query })
  }

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate(phone: string, fullName: string) {
    await api.post('/admin/workers', { phone, fullName })
    setShowCreate(false)
    showMsg('근로자가 등록되었습니다')
    load(search)
  }

  async function handleDelete(worker: Worker) {
    if (!confirm(`"${worker.full_name}" 근로자를 비활성화하시겠습니까?`)) return
    try {
      await api.delete(`/admin/workers/${worker.id}`)
      setWorkers(prev => prev.filter(w => w.id !== worker.id))
      showMsg('비활성화되었습니다')
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : '삭제 실패')
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
        <h1 className="text-2xl font-bold text-gray-900">근로자 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors"
        >
          + 근로자 등록
        </button>
      </div>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— API 연결 후 실제 데이터가 표시됩니다</span>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 전화번호 검색..."
          className="flex-1 border border-[#EFF1F5] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
        />
        <button type="submit" className="bg-[#0669F7] text-white px-4 py-2 rounded-2xl text-sm font-medium">검색</button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : workers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">👷</p>
            <p className="text-sm">근로자가 없습니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {['이름', '전화번호', '지역', '신분증 인증', '권한', '가입일', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{w.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatPhone(w.phone)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{w.current_province ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${w.id_verified ? 'bg-green-100 text-green-700' : 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                      {w.id_verified ? '인증 완료' : '미인증'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {w.is_manager ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-[#FDBC08]/20 text-yellow-700 font-medium">관리자</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-[#EFF1F5] text-[#98A2B2]">근로자</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(w.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end items-center">
                      <Link to={`/workers/${w.id}`} className="text-[#0669F7] hover:underline text-sm">상세 →</Link>
                      {!isDemo && (
                        <button onClick={() => handleDelete(w)} className="text-[#D81A48] text-sm hover:underline">비활성화</button>
                      )}
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
