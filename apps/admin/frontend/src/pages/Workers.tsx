import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_WORKERS } from '../lib/demo-data'

interface Worker {
  id: string
  full_name: string
  phone?: string
  current_province?: string
  id_verified: boolean
  created_at: string
}

export default function Workers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const [query, setQuery] = useState(search)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">근로자 관리</h1>

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
                {['이름', '전화번호', '지역', '신분증 인증', '가입일', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{w.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{w.phone ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{w.current_province ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${w.id_verified ? 'bg-green-100 text-green-700' : 'bg-[#EFF1F5] text-[#98A2B2]00'}`}>
                      {w.id_verified ? '인증 완료' : '미인증'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(w.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/workers/${w.id}`} className="text-[#0669F7] hover:underline text-sm">상세 →</Link>
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
