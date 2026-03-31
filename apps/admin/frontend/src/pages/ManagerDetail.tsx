import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

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

interface Manager {
  id: string
  business_type: string
  company_name: string
  representative_name: string
  worker_full_name?: string
  representative_dob: string | null
  representative_gender: string | null
  business_reg_number: string | null
  contact_phone: string | null
  contact_address: string | null
  province: string | null
  first_site_name: string | null
  first_site_address: string | null
  approval_status: string
  approved_at: string | null
  rejection_reason: string | null
  terms_accepted: boolean
  privacy_accepted: boolean
  phone: string
  created_at: string
  business_reg_url?: string | null
  signature_url?: string | null
  profile_picture_url?: string | null
}

interface AssignedSite {
  id: string
  name: string
  address: string
  province: string
  district: string | null
  status: string
  site_type: string | null
  assigned_at: string
}

interface SiteOption {
  id: string
  name: string
  address: string
  province: string
  status: string
}

type TabKey = 'basic' | 'site' | 'docs' | 'approval' | 'sites'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '기본 정보' },
  { key: 'site', label: '사업장 정보' },
  { key: 'docs', label: '서류 확인' },
  { key: 'approval', label: '승인 정보' },
  { key: 'sites', label: '현장 배정' },
]

const SITE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: '운영 중',
  PAUSED: '일시 중지',
  COMPLETED: '완료',
}
const SITE_STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-[#EFF1F5] text-[#98A2B2]',
}

export default function ManagerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [manager, setManager] = useState<Manager | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('basic')
  const [form, setForm] = useState<Partial<Manager>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  // Site assignment state
  const [assignedSites, setAssignedSites] = useState<AssignedSite[]>([])
  const [allSites, setAllSites] = useState<SiteOption[]>([])
  const [sitesLoading, setSitesLoading] = useState(false)
  const [siteSearch, setSiteSearch] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [unassigning, setUnassigning] = useState<string | null>(null)

  useEffect(() => {
    api.get<Manager>(`/admin/managers/${id}`)
      .then((m) => { setManager(m); setForm(m) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab !== 'sites') return
    setSitesLoading(true)
    Promise.all([
      api.get<AssignedSite[]>(`/admin/managers/${id}/sites`),
      api.get<SiteOption[]>('/admin/sites'),
    ])
      .then(([assigned, sites]) => {
        setAssignedSites(Array.isArray(assigned) ? assigned : [])
        setAllSites(Array.isArray(sites) ? sites : [])
      })
      .catch(console.error)
      .finally(() => setSitesLoading(false))
  }, [tab, id])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function patch(fields: Partial<Manager>) {
    setForm((prev) => ({ ...prev, ...fields }))
  }

  async function saveBasic() {
    setSaving(true)
    try {
      await api.put(`/admin/managers/${id}`, {
        businessType: form.business_type,
        companyName: form.company_name,
        representativeName: form.representative_name,
        representativeDob: form.representative_dob,
        representativeGender: form.representative_gender,
        contactPhone: form.contact_phone,
      })
      showToast('success', '저장되었습니다.')
    } catch {
      showToast('error', '저장 실패. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSite() {
    setSaving(true)
    try {
      await api.put(`/admin/managers/${id}`, {
        businessRegNumber: form.business_reg_number,
        contactAddress: form.contact_address,
        province: form.province,
        firstSiteName: form.first_site_name,
        firstSiteAddress: form.first_site_address,
      })
      showToast('success', '저장되었습니다.')
    } catch {
      showToast('error', '저장 실패. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function approve() {
    if (!confirm('승인하시겠습니까?')) return
    setProcessing(true)
    try {
      await api.post(`/admin/managers/${id}/approve`)
      navigate('/managers?status=PENDING&flash=approved')
    } finally {
      setProcessing(false)
    }
  }

  async function reject() {
    if (!rejectReason.trim()) {
      showToast('error', '반려 사유를 입력해주세요.')
      return
    }
    setProcessing(true)
    try {
      await api.post(`/admin/managers/${id}/reject`, { reason: rejectReason })
      navigate('/managers?status=PENDING&flash=rejected')
    } finally {
      setProcessing(false)
    }
  }

  async function assignSite(siteId: string) {
    setAssigning(true)
    try {
      await api.post(`/admin/managers/${id}/sites/${siteId}`)
      const assigned = await api.get<AssignedSite[]>(`/admin/managers/${id}/sites`)
      setAssignedSites(Array.isArray(assigned) ? assigned : [])
      setSiteSearch('')
      showToast('success', '현장이 배정되었습니다.')
    } catch {
      showToast('error', '현장 배정 실패.')
    } finally {
      setAssigning(false)
    }
  }

  async function unassignSite(siteId: string) {
    setUnassigning(siteId)
    try {
      await api.delete(`/admin/managers/${id}/sites/${siteId}`)
      setAssignedSites((prev) => prev.filter((s) => s.id !== siteId))
      showToast('success', '현장 배정이 해제되었습니다.')
    } catch {
      showToast('error', '해제 실패.')
    } finally {
      setUnassigning(null)
    }
  }

  async function revoke() {
    if (!confirm('권한을 해제하시겠습니까?')) return
    setProcessing(true)
    try {
      await api.post(`/admin/managers/${id}/revoke`)
      setManager((prev) => prev ? { ...prev, approval_status: 'REVOKED' } : null)
      showToast('success', '권한이 해제되었습니다.')
    } catch {
      showToast('error', '처리 실패.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>
  if (!manager) return <div className="p-8 text-center text-[#D81A48]">관리자를 찾을 수 없습니다</div>

  const statusLabel =
    manager.approval_status === 'APPROVED' ? '승인됨' :
    manager.approval_status === 'REJECTED' ? '반려됨' :
    manager.approval_status === 'REVOKED' ? '해제됨' : '대기 중'

  const statusClass =
    manager.approval_status === 'APPROVED' ? 'bg-green-100 text-green-700' :
    manager.approval_status === 'REJECTED' ? 'bg-[#FDE8EE] text-[#D81A48]' :
    manager.approval_status === 'REVOKED' ? 'bg-[#EFF1F5] text-[#98A2B2]' :
    'bg-yellow-100 text-yellow-700'

  return (
    <div className="p-8 max-w-2xl">
      <Link to="/managers" className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">← 목록으로</Link>

      {toast && (
        <div className={`rounded-2xl p-4 mb-5 text-sm border ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-[#FDE8EE] border-[#F4B0C0] text-[#D81A48]'
        }`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#E6F0FE] flex items-center justify-center text-2xl font-bold text-[#0669F7]">
            {(manager.worker_full_name || manager.company_name || manager.representative_name)[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              {manager.worker_full_name ?? manager.representative_name}
            </h2>
            {manager.worker_full_name && (
              <p className="text-xs text-[#98A2B2]">{manager.company_name ?? manager.representative_name}</p>
            )}
            <p className="text-sm text-gray-500 mt-0.5">{formatPhone(manager.phone)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          {manager.approval_status === 'PENDING' && (
            <>
              <button
                onClick={approve}
                disabled={processing}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm disabled:opacity-50"
              >
                승인
              </button>
              <button
                onClick={() => setShowRejectForm(!showRejectForm)}
                className="flex-1 bg-[#D81A48] hover:bg-[#B01539] text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm"
              >
                반려
              </button>
            </>
          )}
          {manager.approval_status === 'APPROVED' && (
            <button
              onClick={revoke}
              disabled={processing}
              className="px-5 py-2.5 border border-[#F4B0C0] text-[#D81A48] hover:bg-[#FDE8EE] font-semibold rounded-2xl transition-colors text-sm disabled:opacity-50"
            >
              권한 해제
            </button>
          )}
          {(manager.approval_status === 'REJECTED' || manager.approval_status === 'REVOKED') && (
            <button
              onClick={approve}
              disabled={processing}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-2xl transition-colors text-sm disabled:opacity-50"
            >
              재심사 (승인 처리)
            </button>
          )}
        </div>

        {showRejectForm && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">반려 사유</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-3"
              placeholder="반려 사유를 입력하세요"
            />
            <button
              onClick={reject}
              disabled={processing}
              className="w-full bg-[#D81A48] hover:bg-[#B01539] text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm disabled:opacity-50"
            >
              반려 확정
            </button>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-[#EFF1F5] rounded-2xl p-1 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white shadow-sm text-[#0669F7] font-semibold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">

        {/* 기본 정보 */}
        {tab === 'basic' && (
          <>
            <Field label="사업 유형">
              <select className={INPUT} value={form.business_type ?? ''} onChange={(e) => patch({ business_type: e.target.value })}>
                <option value="INDIVIDUAL">개인</option>
                <option value="CORPORATE">법인</option>
              </select>
            </Field>
            {form.business_type === 'CORPORATE' && (
              <Field label="회사명">
                <input className={INPUT} value={form.company_name ?? ''} onChange={(e) => patch({ company_name: e.target.value })} />
              </Field>
            )}
            <Field label="대표자명">
              <input className={INPUT} value={form.representative_name ?? ''} onChange={(e) => patch({ representative_name: e.target.value })} />
            </Field>
            <Field label="대표자 생년월일">
              <input type="date" className={INPUT} value={form.representative_dob ?? ''} onChange={(e) => patch({ representative_dob: e.target.value })} />
            </Field>
            <Field label="대표자 성별">
              <select className={INPUT} value={form.representative_gender ?? ''} onChange={(e) => patch({ representative_gender: e.target.value })}>
                <option value="">선택 안 함</option>
                <option value="MALE">남성</option>
                <option value="FEMALE">여성</option>
                <option value="OTHER">기타</option>
              </select>
            </Field>
            <Field label="연락처 전화번호">
              <input className={INPUT} value={form.contact_phone ?? ''} onChange={(e) => patch({ contact_phone: e.target.value })} />
            </Field>
            <SaveButton saving={saving} onClick={saveBasic} />
          </>
        )}

        {/* 사업장 정보 */}
        {tab === 'site' && (
          <>
            <Field label="사업자등록번호">
              <input className={INPUT} value={form.business_reg_number ?? ''} onChange={(e) => patch({ business_reg_number: e.target.value })} />
            </Field>
            <Field label="사업장 주소">
              <textarea className={INPUT + ' resize-none'} rows={2} value={form.contact_address ?? ''} onChange={(e) => patch({ contact_address: e.target.value })} />
            </Field>
            <Field label="성/시 (Province)">
              <input className={INPUT} value={form.province ?? ''} onChange={(e) => patch({ province: e.target.value })} />
            </Field>
            <Field label="첫 번째 현장명">
              <input className={INPUT} value={form.first_site_name ?? ''} onChange={(e) => patch({ first_site_name: e.target.value })} />
            </Field>
            <Field label="첫 번째 현장 주소">
              <input className={INPUT} value={form.first_site_address ?? ''} onChange={(e) => patch({ first_site_address: e.target.value })} />
            </Field>
            <SaveButton saving={saving} onClick={saveSite} />
          </>
        )}

        {/* 서류 확인 */}
        {tab === 'docs' && (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">첨부 서류 이미지</h3>
            <div className="space-y-5">
              <ImageField label="사업자등록증" url={manager.business_reg_url} />
              <ImageField label="서명" url={manager.signature_url} />
              <ImageField label="프로필 사진" url={manager.profile_picture_url} />
            </div>
          </>
        )}

        {/* 승인 정보 */}
        {tab === 'approval' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">승인 상태</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
            <ReadOnlyField label="승인일" value={manager.approved_at ? new Date(manager.approved_at).toLocaleString('ko-KR') : '-'} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">반려 사유</label>
              <p className="text-sm text-gray-700 bg-[#EFF1F5] rounded-2xl px-3 py-2.5 border border-[#EFF1F5] min-h-[2.5rem]">
                {manager.rejection_reason ?? '-'}
              </p>
            </div>
            <ReadOnlyField label="가입일" value={new Date(manager.created_at).toLocaleString('ko-KR')} />
            <ReadOnlyField label="전화번호 (인증)" value={formatPhone(manager.phone)} />
          </>
        )}

        {/* 현장 배정 */}
        {tab === 'sites' && (
          <SiteAssignmentTab
            assignedSites={assignedSites}
            allSites={allSites}
            loading={sitesLoading}
            siteSearch={siteSearch}
            setSiteSearch={setSiteSearch}
            assigning={assigning}
            unassigning={unassigning}
            onAssign={assignSite}
            onUnassign={unassignSite}
          />
        )}
      </div>
    </div>
  )
}

// ── Site Assignment Tab ────────────────────────────────────────────────────────

function SiteAssignmentTab({
  assignedSites,
  allSites,
  loading,
  siteSearch,
  setSiteSearch,
  assigning,
  unassigning,
  onAssign,
  onUnassign,
}: {
  assignedSites: AssignedSite[]
  allSites: SiteOption[]
  loading: boolean
  siteSearch: string
  setSiteSearch: (v: string) => void
  assigning: boolean
  unassigning: string | null
  onAssign: (siteId: string) => void
  onUnassign: (siteId: string) => void
}) {
  const assignedIds = new Set(assignedSites.map((s) => s.id))

  const filteredSites = allSites.filter((s) => {
    if (assignedIds.has(s.id)) return false
    if (!siteSearch.trim()) return true
    const q = siteSearch.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)
  })

  if (loading) {
    return <div className="py-8 text-center text-gray-400 text-sm">로딩 중...</div>
  }

  return (
    <div className="space-y-6">

      {/* Currently assigned sites */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">배정된 현장</p>
          <span className="text-xs text-[#98A2B2]">{assignedSites.length}개</span>
        </div>

        {assignedSites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EFF1F5] py-8 text-center">
            <p className="text-sm text-[#98A2B2]">배정된 현장이 없습니다.</p>
            <p className="text-xs text-[#98A2B2] mt-1">아래에서 현장을 선택해 배정하세요.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedSites.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-2xl border border-[#EFF1F5] bg-white hover:bg-[#F9FAFB]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                    <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${SITE_STATUS_CLASS[s.status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                      {SITE_STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#98A2B2] mt-0.5 truncate">{s.address}</p>
                  <p className="text-xs text-[#98A2B2]">
                    배정일: {new Date(s.assigned_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => onUnassign(s.id)}
                  disabled={unassigning === s.id}
                  className="shrink-0 text-xs text-[#D81A48] border border-[#F4B0C0] rounded-xl px-3 py-1.5 hover:bg-[#FDE8EE] disabled:opacity-50 transition-colors"
                >
                  {unassigning === s.id ? '해제 중...' : '배정 해제'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Site picker */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">현장 추가</p>
        <input
          type="text"
          value={siteSearch}
          onChange={(e) => setSiteSearch(e.target.value)}
          placeholder="현장명 또는 주소 검색..."
          className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7] mb-3"
        />

        {filteredSites.length === 0 ? (
          <div className="py-6 text-center text-sm text-[#98A2B2]">
            {allSites.length === 0
              ? '등록된 현장이 없습니다.'
              : '검색 결과가 없거나 모든 현장이 배정되었습니다.'}
          </div>
        ) : (
          <div className="border border-[#EFF1F5] rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
            {filteredSites.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 hover:bg-[#F2F4F5] ${i > 0 ? 'border-t border-[#EFF1F5]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-[#98A2B2] truncate">{s.address}</p>
                  <span className={`mt-0.5 inline-block px-2 py-0.5 text-xs rounded-full ${SITE_STATUS_CLASS[s.status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                    {SITE_STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>
                <button
                  onClick={() => onAssign(s.id)}
                  disabled={assigning}
                  className="shrink-0 text-xs bg-[#0669F7] text-white rounded-xl px-3 py-1.5 hover:bg-[#0550C4] disabled:opacity-50 transition-colors font-medium"
                >
                  {assigning ? '배정 중...' : '배정'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const INPUT = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <p className="text-sm text-gray-800 bg-[#EFF1F5] rounded-2xl px-3 py-2.5 border border-[#EFF1F5]">{value}</p>
    </div>
  )
}

function ImageField({ label, url }: { label: string; url: string | null | undefined }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">{label}</label>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={label} className="max-w-xs rounded border border-[#EFF1F5] hover:opacity-90 transition-opacity" />
        </a>
      ) : (
        <div className="inline-block px-3 py-1.5 bg-[#EFF1F5] text-[#98A2B2] text-xs rounded-2xl border border-[#EFF1F5]">미등록</div>
      )}
    </div>
  )
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="w-full bg-[#0669F7] hover:bg-[#0550C4] text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm disabled:opacity-50"
    >
      {saving ? '저장 중...' : '저장'}
    </button>
  )
}
