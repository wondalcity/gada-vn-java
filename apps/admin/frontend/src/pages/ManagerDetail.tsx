import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

interface Manager {
  id: string
  business_type: string
  company_name: string
  representative_name: string
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

type TabKey = 'basic' | 'site' | 'docs' | 'approval'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '기본 정보' },
  { key: 'site', label: '사업장 정보' },
  { key: 'docs', label: '서류 확인' },
  { key: 'approval', label: '승인 정보' },
]

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

  useEffect(() => {
    api.get<Manager>(`/admin/managers/${id}`)
      .then((m) => { setManager(m); setForm(m) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

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
    manager.approval_status === 'REVOKED' ? 'bg-[#EFF1F5] text-[#98A2B2]00' :
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
            {(manager.company_name || manager.representative_name)[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{manager.company_name ?? manager.representative_name}</h2>
            <p className="text-sm text-gray-500">{manager.phone ?? '-'}</p>
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
          {manager.approval_status === 'REJECTED' && (
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
            <ReadOnlyField label="전화번호 (인증)" value={manager.phone ?? '-'} />
          </>
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
        <div className="inline-block px-3 py-1.5 bg-[#EFF1F5] text-[#98A2B2]00 text-xs rounded-2xl border border-[#EFF1F5]">미등록</div>
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
