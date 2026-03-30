import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_SITES, DEMO_COMPANIES } from '../lib/demo-data'

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
  manager_profile_id?: string
  company_id?: string
  company_name?: string
  company_contact_name?: string
  company_contact_phone?: string
  company_contact_email?: string
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

interface Manager {
  id: string
  representative_name: string
  company_name?: string
}

interface Company {
  id: string
  name: string
}

const SITE_STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-[#EFF1F5] text-[#98A2B2]',
  PAUSED: 'bg-yellow-100 text-yellow-700',
}

const JOB_STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-[#EFF1F5] text-[#98A2B2]',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  FILLED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-[#FDE8EE] text-[#D81A48]',
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'

// ── Site Form Modal ────────────────────────────────────────────────────────
function SiteFormModal({
  site,
  managers,
  companies,
  onSave,
  onCancel,
}: {
  site?: Partial<Site>
  managers: Manager[]
  companies: Company[]
  onSave: (data: Record<string, string>) => Promise<void>
  onCancel: () => void
}) {
  const isEdit = Boolean(site?.id)
  const [form, setForm] = useState({
    managerId: site?.manager_profile_id ?? '',
    companyId: site?.company_id ?? '',
    name: site?.name ?? '',
    address: site?.address ?? '',
    province: site?.province ?? '',
    district: site?.district ?? '',
    siteType: site?.site_type ?? '',
    status: site?.status ?? 'ACTIVE',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <h3 className="text-base font-bold text-gray-900 mb-4">{isEdit ? '현장 수정' : '새 현장 등록'}</h3>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">건설사</label>
            <select className={IN} value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}>
              <option value="">선택 안함</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">담당 관리자 *</label>
            <select required className={IN} value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}>
              <option value="">선택...</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.representative_name}{m.company_name ? ` (${m.company_name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">현장명 *</label>
            <input required className={IN} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">주소 *</label>
            <input required className={IN} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">성/지역 *</label>
            <input required className={IN} value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">군/구</label>
            <input className={IN} value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">현장 유형</label>
            <input className={IN} value={form.siteType} onChange={e => setForm({ ...form, siteType: e.target.value })} placeholder="예: 아파트, 상업, 도로..." />
          </div>
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">상태</label>
              <select className={IN} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">운영 중</option>
                <option value="PAUSED">일시중지</option>
                <option value="COMPLETED">완료</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">취소</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? '저장 중...' : isEdit ? '수정 완료' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Site Detail Panel ──────────────────────────────────────────────────────
function SiteDetailPanel({
  siteId,
  managers,
  companies,
  onBack,
  onDeleted,
}: {
  siteId: string
  managers: Manager[]
  companies: Company[]
  onBack: () => void
  onDeleted: () => void
}) {
  const navigate = useNavigate()
  const [site, setSite] = useState<SiteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<SiteDetail>(`/admin/sites/${siteId}`)
      .then((data) => { setSite(data); setIsDemo(false) })
      .catch(() => {
        const demo = DEMO_SITES.find((s) => s.id === siteId)
        if (demo) {
          const company = demo.company_id
            ? DEMO_COMPANIES.find(c => c.id === demo.company_id)
            : undefined
          setSite({
            ...demo,
            company_contact_name: company?.contact_name,
            company_contact_phone: company?.contact_phone,
            company_contact_email: company?.contact_email,
          } as unknown as SiteDetail)
          setIsDemo(true)
        } else {
          setError('현장 정보를 불러올 수 없습니다')
        }
      })
      .finally(() => setLoading(false))
  }, [siteId])

  useEffect(() => { load() }, [load])

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSaveEdit(data: Record<string, string>) {
    await api.put(`/admin/sites/${siteId}`, data)
    setShowEdit(false)
    showMsg('수정되었습니다')
    load()
  }

  async function handleDelete() {
    if (!confirm('이 현장을 삭제하시겠습니까? 연결된 공고도 함께 삭제됩니다.')) return
    setDeleting(true)
    try {
      await api.delete(`/admin/sites/${siteId}`)
      onDeleted()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
  if (error) return <div className="p-8 text-center text-[#D81A48] text-sm">{error}</div>
  if (!site) return null

  return (
    <div className="p-8">
      {showEdit && (
        <SiteFormModal
          site={site}
          managers={managers}
          companies={companies}
          onSave={handleSaveEdit}
          onCancel={() => setShowEdit(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-lg bg-[#25282A] text-white whitespace-nowrap">
          {toast}
        </div>
      )}

      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
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
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${SITE_STATUS_BADGE[site.status ?? ''] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
              {site.status === 'ACTIVE' ? '운영 중' : site.status === 'COMPLETED' ? '완료' : site.status === 'PAUSED' ? '일시중지' : (site.status ?? '-')}
            </span>
            {!isDemo && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-3 py-1.5 text-xs border border-[#EFF1F5] rounded-xl text-gray-600 hover:bg-[#F2F4F5]"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-xs border border-[#F4B0C0] rounded-xl text-[#D81A48] hover:bg-[#FDE8EE] disabled:opacity-50"
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">유형</span>
            <p className="font-medium text-gray-900 mt-0.5">{site.site_type ?? '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">건설사</span>
            {site.company_id ? (
              <button
                onClick={() => navigate(`/companies/${site.company_id}`)}
                className="mt-0.5 flex items-center gap-1 font-medium text-[#0669F7] hover:underline"
              >
                🏢 {site.company_name}
              </button>
            ) : (
              <p className="font-medium text-gray-400 mt-0.5">-</p>
            )}
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

        {/* 건설사 연락처 정보 */}
        {site.company_id && (site.company_contact_name || site.company_contact_phone || site.company_contact_email) && (
          <div className="mt-4 pt-4 border-t border-[#EFF1F5]">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">건설사 담당자 정보</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {site.company_contact_name && (
                <div>
                  <span className="text-gray-500">담당자</span>
                  <p className="font-medium text-gray-900 mt-0.5">{site.company_contact_name}</p>
                </div>
              )}
              {site.company_contact_phone && (
                <div>
                  <span className="text-gray-500">전화번호</span>
                  <p className="font-medium text-gray-900 mt-0.5">{site.company_contact_phone}</p>
                </div>
              )}
              {site.company_contact_email && (
                <div>
                  <span className="text-gray-500">이메일</span>
                  <p className="font-medium text-gray-900 mt-0.5">{site.company_contact_email}</p>
                </div>
              )}
            </div>
          </div>
        )}
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
                    <span className={`px-2 py-1 text-xs rounded-full ${JOB_STATUS_BADGE[j.status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                      {j.status === 'OPEN' ? '모집 중' : j.status === 'CLOSED' ? '마감' : j.status === 'DRAFT' ? '임시저장' : j.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{j.work_date ? formatDate(j.work_date) : '-'}</td>
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

// ── Main Sites page ────────────────────────────────────────────────────────
export default function Sites() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editSite, setEditSite] = useState<Site | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadManagers = useCallback(async () => {
    try {
      const res = await api.get<{ data: Manager[] }>('/admin/managers?status=APPROVED&limit=100')
      setManagers(res.data ?? [])
    } catch {
      // non-fatal
    }
  }, [])

  const loadCompanies = useCallback(async () => {
    try {
      const data = await api.get<Company[]>('/admin/companies')
      setCompanies(Array.isArray(data) ? data : [])
    } catch {
      // non-fatal
    }
  }, [])

  const load = useCallback(() => {
    if (id) return
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

  useEffect(() => {
    load()
    loadManagers()
    loadCompanies()
  }, [load, loadManagers, loadCompanies])

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate(data: Record<string, string>) {
    await api.post('/admin/sites', data)
    setShowCreate(false)
    showMsg('현장이 등록되었습니다')
    load()
  }

  async function handleEdit(data: Record<string, string>) {
    if (!editSite) return
    await api.put(`/admin/sites/${editSite.id}`, data)
    setEditSite(null)
    showMsg('수정되었습니다')
    load()
  }

  async function handleDelete(site: Site) {
    if (!confirm(`"${site.name}" 현장을 삭제하시겠습니까? 연결된 공고도 함께 삭제됩니다.`)) return
    try {
      await api.delete(`/admin/sites/${site.id}`)
      setSites(prev => prev.filter(s => s.id !== site.id))
      showMsg('삭제되었습니다')
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  // Detail view
  if (id) {
    return (
      <SiteDetailPanel
        siteId={id}
        managers={managers}
        companies={companies}
        onBack={() => navigate('/sites')}
        onDeleted={() => navigate('/sites')}
      />
    )
  }

  // List view
  return (
    <div className="p-8">
      {(showCreate || editSite) && (
        <SiteFormModal
          site={editSite ?? undefined}
          managers={managers}
          companies={companies}
          onSave={editSite ? handleEdit : handleCreate}
          onCancel={() => { setShowCreate(false); setEditSite(null) }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-lg bg-[#25282A] text-white whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">현장 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors"
        >
          + 새 현장
        </button>
      </div>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— API 연결 후 실제 데이터가 표시됩니다</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : sites.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏗️</p>
            <p className="text-sm mb-4">등록된 현장이 없습니다</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0669F7] text-white text-sm font-medium rounded-2xl">+ 첫 번째 현장 등록</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {['현장명', '건설사', '주소', '상태', '담당 관리자', '공고 수', '등록일', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 cursor-pointer" onClick={() => navigate(`/sites/${s.id}`)}>
                    {s.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {s.company_name ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">🏢 {s.company_name}</span>
                    ) : (
                      <span className="text-[#98A2B2]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {[s.province, s.district].filter(Boolean).join(' · ') || s.address || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${SITE_STATUS_BADGE[s.status ?? ''] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
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
                    <div className="flex gap-3 justify-end items-center">
                      <button onClick={() => navigate(`/sites/${s.id}`)} className="text-[#0669F7] hover:underline text-sm">상세</button>
                      {!isDemo && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setEditSite(s) }} className="text-gray-400 hover:text-gray-700 text-sm">수정</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(s) }} className="text-[#D81A48] text-sm">삭제</button>
                        </>
                      )}
                    </div>
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
