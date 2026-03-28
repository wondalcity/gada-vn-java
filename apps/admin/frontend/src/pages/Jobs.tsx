import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_JOBS } from '../lib/demo-data'

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

const STATUS_TABS = [
  { key: '', label: '전체' },
  { key: 'OPEN', label: '모집 중' },
  { key: 'FILLED', label: '마감' },
  { key: 'CANCELLED', label: '취소됨' },
]

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  FILLED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-[#EFF1F5] text-[#98A2B2]00',
  COMPLETED: 'bg-purple-100 text-purple-700',
}

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const flash = searchParams.get('flash') ?? ''

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
    if (!confirm('이 공고를 취소 처리하시겠습니까?')) return
    await api.delete(`/admin/jobs/${id}`)
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">일자리 관리</h1>
        <Link to="/jobs/new" className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors">
          + 새 일자리
        </Link>
      </div>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— API 연결 후 실제 데이터가 표시됩니다</span>
        </div>
      )}

      {flash === 'created' && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm">✅ 일자리가 등록되었습니다.</div>}
      {flash === 'updated' && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm">✅ 수정되었습니다.</div>}
      {flash === 'deleted' && <div className="bg-[#F2F4F5] border border-[#EFF1F5] text-gray-600 rounded-2xl p-3 mb-4 text-sm">🗑️ 취소 처리되었습니다.</div>}

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((t) => (
          <button key={t.key} onClick={() => setSearchParams({ status: t.key, page: '1' })}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${status === t.key ? 'bg-[#0669F7] text-white' : 'bg-white text-gray-600 hover:bg-[#F2F4F5] border border-[#EFF1F5]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏗️</p>
            <p className="text-sm mb-4">일자리가 없습니다</p>
            <Link to="/jobs/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0669F7] text-white text-sm font-medium rounded-2xl">+ 첫 번째 일자리 등록</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {['공고 제목', '현장명', '근무일', '일 노임', '모집인원', '상태', ''].map((h) => (
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
                  <td className="px-6 py-4 text-sm text-[#0669F7] font-medium">₫{j.daily_wage.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{j.slots_filled ?? 0}/{j.slots_total}명</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE[j.status] ?? 'bg-[#EFF1F5] text-[#98A2B2]00'}`}>
                      {j.status === 'OPEN' ? '모집 중' : j.status === 'FILLED' ? '마감' : j.status === 'CANCELLED' ? '취소됨' : j.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <Link to={`/jobs/${j.id}`} className="text-[#0669F7] hover:underline text-sm">상세</Link>
                      <Link to={`/jobs/${j.id}/edit`} className="text-gray-400 hover:text-gray-700 text-sm">수정</Link>
                      <button onClick={() => deleteJob(j.id)} className="text-[#D81A48] hover:text-[#D81A48] text-sm">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">총 {total}건</div>
    </div>
  )
}
