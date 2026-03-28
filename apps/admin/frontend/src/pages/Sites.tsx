import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_SITES } from '../lib/demo-data'

interface Site {
  id: string
  name: string
  address?: string
  province?: string
  district?: string
  status?: string
  site_type?: string
  created_at: string
  manager_name?: string
  manager_phone?: string
  job_count: number
  open_job_count: number
}

interface SiteJob {
  id: string
  title: string
  status: string
  work_date?: string
  daily_wage?: number
  slots_total?: number
  slots_filled?: number
  application_count: number
  hired_count: number
}

interface SiteDetail extends Omit<Site, 'job_count' | 'open_job_count'> {
  jobs: SiteJob[]
}

const SITE_STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-[#EFF1F5] text-[#98A2B2]00',
  PAUSED: 'bg-yellow-100 text-yellow-700',
}

const JOB_STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-[#EFF1F5] text-[#98A2B2]00',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  FILLED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-[#FDE8EE] text-[#D81A48]',
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

function SiteDetailPanel({ siteId, onBack }: { siteId: string; onBack: () => void }) {
  const [site, setSite] = useState<SiteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<SiteDetail>(`/admin/sites/${siteId}`)
      .then((data) => setSite(data))
      .catch(() => {
        const demo = DEMO_SITES.find((s) => s.id === siteId)
        if (demo) {
          setSite(demo as unknown as SiteDetail)
          setIsDemo(true)
        } else {
          setError('현장 정보를 불러올 수 없습니다')
        }
      })
      .finally(() => setLoading(false))
  }, [siteId])

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
  if (error) return <div className="p-8 text-center text-[#D81A48] text-sm">{error}</div>
  if (!site) return null

  return (
    <div className="p-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        ← 현장 목록으로 돌아가기
      </button>
      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— API 연결 후 실제 데이터가 표시됩니다</span>
        </div>
      )}

      {/* Site info header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{site.name}</h1>
            <p className="text-sm text-gray-500">
              {[site.province, site.district, site.address].filter(Boolean).join(' · ')}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs rounded-full font-medium ${SITE_STATUS_BADGE[site.status ?? ''] ?? 'bg-[#EFF1F5] text-[#98A2B2]00'}`}
          >
            {site.status === 'ACTIVE' ? '운영 중' : site.status === 'COMPLETED' ? '완료' : site.status === 'PAUSED' ? '일시중지' : (site.status ?? '-')}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">유형</span>
            <p className="font-medium text-gray-900 mt-0.5">{site.site_type ?? '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">담당 관리자</span>
            <p className="font-medium text-gray-900 mt-0.5">{site.manager_name ?? '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">연락처</span>
            <p className="font-medium text-gray-900 mt-0.5">{site.manager_phone ?? '-'}</p>
          </div>
        </div>
      </div>

      {/* Jobs table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EFF1F5]">
          <h2 className="text-base font-semibold text-gray-900">공고 목록</h2>
        </div>
        {site.jobs.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">등록된 공고가 없습니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {['공고명', '상태', '근무일', '일 노임', '지원자수', '선발인원'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {site.jobs.map((j) => (
                <tr key={j.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{j.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${JOB_STATUS_BADGE[j.status] ?? 'bg-[#EFF1F5] text-[#98A2B2]00'}`}>
                      {j.status === 'OPEN' ? '모집 중' : j.status === 'CLOSED' ? '마감' : j.status === 'DRAFT' ? '임시저장' : j.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {j.work_date ? formatDate(j.work_date) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#0669F7] font-medium">
                    {j.daily_wage ? `₫${Number(j.daily_wage).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{j.application_count}명</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{j.hired_count}명</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function Sites() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    if (id) return // detail view — don't load list
    setLoading(true)
    api.get<Site[]>('/admin/sites')
      .then((data) => {
        const arr = Array.isArray(data) ? data : []
        if (arr.length === 0) {
          setSites(DEMO_SITES as unknown as Site[])
          setIsDemo(true)
        } else {
          setSites(arr)
          setIsDemo(false)
        }
      })
      .catch(() => {
        setSites(DEMO_SITES as unknown as Site[])
        setIsDemo(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Detail view
  if (id) {
    return <SiteDetailPanel siteId={id} onBack={() => navigate('/sites')} />
  }

  // List view
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">현장 관리</h1>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— API 연결 후 실제 데이터가 표시됩니다</span>
        </div>
      )}

      {error && (
        <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-2xl p-3 mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : sites.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏗️</p>
            <p className="text-sm">등록된 현장이 없습니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {['현장명', '주소', '상태', '담당 관리자', '공고 수', '등록일', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {sites.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-[#F2F4F5] cursor-pointer"
                  onClick={() => navigate(`/sites/${s.id}`)}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {[s.province, s.district].filter(Boolean).join(' · ') || s.address || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${SITE_STATUS_BADGE[s.status ?? ''] ?? 'bg-[#EFF1F5] text-[#98A2B2]00'}`}>
                      {s.status === 'ACTIVE' ? '운영 중' : s.status === 'COMPLETED' ? '완료' : s.status === 'PAUSED' ? '일시중지' : (s.status ?? '-')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.manager_name ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="text-blue-600 font-medium">{s.open_job_count}</span>
                    <span className="text-gray-400">/{s.job_count}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(s.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[#0669F7] text-sm">상세 →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">총 {sites.length}개 현장</div>
    </div>
  )
}
