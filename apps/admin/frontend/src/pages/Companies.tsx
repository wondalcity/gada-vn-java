import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_COMPANIES } from '../lib/demo-data'

interface Company {
  id: string
  name: string
  business_reg_no?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  signature_s3_key?: string
  signature_url?: string
  business_reg_cert_s3_key?: string
  business_reg_cert_url?: string
  site_count: number
  created_at: string
}

function formatDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR')
}

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'

// ── Company Form Modal ──────────────────────────────────────────────────────
function CompanyFormModal({
  company,
  onSave,
  onCancel,
}: {
  company?: Partial<Company>
  onSave: (data: Record<string, string>) => Promise<void>
  onCancel: () => void
}) {
  const isEdit = Boolean(company?.id)
  const [form, setForm] = useState({
    name: company?.name ?? '',
    businessRegNo: company?.business_reg_no ?? '',
    contactName: company?.contact_name ?? '',
    contactPhone: company?.contact_phone ?? '',
    contactEmail: company?.contact_email ?? '',
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
        <h3 className="text-base font-bold text-gray-900 mb-4">{isEdit ? '건설사 수정' : '새 건설사 등록'}</h3>
        {error && (
          <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">건설사명 *</label>
            <input required className={IN} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">사업자등록번호</label>
            <input className={IN} value={form.businessRegNo} onChange={e => setForm({ ...form, businessRegNo: e.target.value })} placeholder="000-00-00000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">담당자명</label>
            <input className={IN} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">담당자 전화번호</label>
            <input className={IN} value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="0901 234 567" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">담당자 이메일</label>
            <input type="email" className={IN} value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
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

// ── Company Detail Panel ────────────────────────────────────────────────────
function CompanyDetailPanel({
  companyId,
  onBack,
  onDeleted,
}: {
  companyId: string
  onBack: () => void
  onDeleted: () => void
}) {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<Company>(`/admin/companies/${companyId}`)
      .then(data => setCompany(data))
      .catch(() => {
        const demo = DEMO_COMPANIES.find(c => c.id === companyId)
        if (demo) setCompany(demo as unknown as Company)
        else setError('건설사 정보를 불러올 수 없습니다')
      })
      .finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => { load() }, [load])

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSaveEdit(data: Record<string, string>) {
    await api.put(`/admin/companies/${companyId}`, data)
    setShowEdit(false)
    showMsg('수정되었습니다')
    load()
  }

  async function handleDelete() {
    if (!confirm('이 건설사를 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await api.delete(`/admin/companies/${companyId}`)
      onDeleted()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
  if (error) return <div className="p-8 text-center text-[#D81A48] text-sm">{error}</div>
  if (!company) return null

  return (
    <div className="p-8">
      {showEdit && (
        <CompanyFormModal
          company={company}
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
        ← 건설사 목록으로 돌아가기
      </button>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
            {company.business_reg_no && (
              <p className="text-sm text-gray-500">사업자등록번호: {company.business_reg_no}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowEdit(true)} className="px-3 py-1.5 text-xs border border-[#EFF1F5] rounded-xl text-gray-600 hover:bg-[#F2F4F5]">수정</button>
            <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-xs border border-[#F4B0C0] rounded-xl text-[#D81A48] hover:bg-[#FDE8EE] disabled:opacity-50">삭제</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">담당자</p>
              <p className="text-sm font-medium text-gray-900">{company.contact_name ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">전화번호</p>
              <p className="text-sm font-medium text-gray-900">{company.contact_phone ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">이메일</p>
              <p className="text-sm font-medium text-gray-900">{company.contact_email ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">연결된 현장</p>
              <p className="text-sm font-bold text-[#0669F7]">{company.site_count}개</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Company signature */}
            <div>
              <p className="text-xs text-gray-500 mb-2">건설사 서명 / 법인인감</p>
              {company.signature_url ? (
                <div className="border border-[#EFF1F5] rounded-xl p-3 bg-[#FAFCFF] inline-block">
                  <img src={company.signature_url} alt="건설사 서명" className="max-h-24 max-w-[200px] object-contain" />
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl h-20 flex items-center justify-center">
                  <p className="text-xs text-[#98A2B2]">서명 미등록</p>
                </div>
              )}
            </div>

            {/* Business registration cert */}
            {company.business_reg_cert_url && (
              <div>
                <p className="text-xs text-gray-500 mb-2">사업자등록증</p>
                <a
                  href={company.business_reg_cert_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-xl border border-[#EFF1F5] text-[#0669F7] hover:bg-[#F0F6FF]"
                >
                  📄 사업자등록증 보기
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Companies page ─────────────────────────────────────────────────────
export default function Companies() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(() => {
    if (id) return
    setLoading(true)
    api.get<Company[]>('/admin/companies')
      .then(data => {
        const arr = Array.isArray(data) ? data : []
        if (arr.length === 0) {
          setCompanies(DEMO_COMPANIES as unknown as Company[])
          setIsDemo(true)
        } else {
          setCompanies(arr)
          setIsDemo(false)
        }
      })
      .catch(() => {
        setCompanies(DEMO_COMPANIES as unknown as Company[])
        setIsDemo(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate(data: Record<string, string>) {
    await api.post('/admin/companies', data)
    setShowCreate(false)
    showMsg('건설사가 등록되었습니다')
    load()
  }

  async function handleEdit(data: Record<string, string>) {
    if (!editCompany) return
    await api.put(`/admin/companies/${editCompany.id}`, data)
    setEditCompany(null)
    showMsg('수정되었습니다')
    load()
  }

  async function handleDelete(company: Company) {
    if (!confirm(`"${company.name}" 건설사를 삭제하시겠습니까?`)) return
    try {
      await api.delete(`/admin/companies/${company.id}`)
      setCompanies(prev => prev.filter(c => c.id !== company.id))
      showMsg('삭제되었습니다')
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  if (id) {
    return (
      <CompanyDetailPanel
        companyId={id}
        onBack={() => navigate('/companies')}
        onDeleted={() => navigate('/companies')}
      />
    )
  }

  return (
    <div className="p-8">
      {(showCreate || editCompany) && (
        <CompanyFormModal
          company={editCompany ?? undefined}
          onSave={editCompany ? handleEdit : handleCreate}
          onCancel={() => { setShowCreate(false); setEditCompany(null) }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-lg bg-[#25282A] text-white whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">건설사 관리</h1>
          <p className="text-sm text-gray-500 mt-1">현장과 연결될 건설사 정보를 관리합니다</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors"
        >
          + 새 건설사
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
        ) : companies.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-sm mb-4">등록된 건설사가 없습니다</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0669F7] text-white text-sm font-medium rounded-2xl">+ 첫 번째 건설사 등록</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {['건설사명', '사업자등록번호', '담당자', '연락처', '현장 수', '서명', '등록일', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:text-[#0669F7]" onClick={() => navigate(`/companies/${c.id}`)}>
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.business_reg_no ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.contact_name ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.contact_phone ?? '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="text-blue-600 font-medium">{c.site_count}</span>
                    <span className="text-gray-400">개</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {c.signature_url ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">✓ 등록됨</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#EFF1F5] text-[#98A2B2] text-xs">미등록</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(c.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end items-center">
                      <button onClick={() => navigate(`/companies/${c.id}`)} className="text-[#0669F7] hover:underline text-sm">상세</button>
                      {!isDemo && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setEditCompany(c) }} className="text-gray-400 hover:text-gray-700 text-sm">수정</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(c) }} className="text-[#D81A48] text-sm">삭제</button>
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

      <div className="mt-4 text-xs text-gray-400 text-right">총 {companies.length}개 건설사</div>
    </div>
  )
}
