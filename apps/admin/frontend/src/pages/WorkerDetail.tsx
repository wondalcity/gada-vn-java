import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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

interface Worker {
  id: string
  user_id: string
  full_name: string
  date_of_birth: string
  gender: string
  bio: string
  experience_months: number
  primary_trade_id: number | null
  current_province: string
  current_district: string
  id_number: string
  id_verified: boolean
  id_verified_at: string | null
  signature_url: string | null
  id_front_url: string | null
  id_back_url: string | null
  bank_book_url: string | null
  profile_picture_s3_key: string | null
  bank_name: string
  bank_account_number: string
  terms_accepted: boolean
  privacy_accepted: boolean
  profile_complete: boolean
  phone: string
  email: string
  lat: number | null
  lng: number | null
  created_at: string
  trade_name_ko: string
  is_manager: boolean
  manager_profile_id?: string | null
  manager_approval_status?: string | null
  manager_company_name?: string | null
  manager_representative_name?: string | null
  manager_approved_at?: string | null
}

interface TradeSkill {
  trade_id: number
  years: number
  name_ko: string
  name_vi: string
  code: string
}

interface Trade {
  id: number
  code: string
  name_ko: string
  name_vi: string
}

type TabKey = 'basic' | 'docs' | 'bank' | 'trades' | 'manager' | 'misc'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '기본 정보' },
  { key: 'docs', label: '신분증 / 서류' },
  { key: 'bank', label: '은행 / 결제' },
  { key: 'trades', label: '직종 / 기술' },
  { key: 'manager', label: '관리자' },
  { key: 'misc', label: '기타' },
]

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('basic')
  const [form, setForm] = useState<Partial<Worker>>({})
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Trade skills state
  const [tradeSkills, setTradeSkills] = useState<TradeSkill[]>([])
  const [allTrades, setAllTrades] = useState<Trade[]>([])
  const [skillRows, setSkillRows] = useState<{ tradeId: number | ''; years: number }[]>([])
  const [savingSkills, setSavingSkills] = useState(false)
  const [tradesLoading, setTradesLoading] = useState(false)

  useEffect(() => {
    api.get<Worker>(`/admin/workers/${id}`)
      .then((w) => { setWorker(w); setForm(w) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab === 'trades') {
      setTradesLoading(true)
      Promise.all([
        api.get<TradeSkill[]>(`/admin/workers/${id}/trade-skills`),
        api.get<Trade[]>('/admin/trades'),
      ])
        .then(([skills, trades]) => {
          setTradeSkills(skills)
          setAllTrades(trades)
          setSkillRows(skills.map((s) => ({ tradeId: s.trade_id, years: s.years })))
        })
        .catch(console.error)
        .finally(() => setTradesLoading(false))
    }
  }, [tab, id])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function patch(fields: Partial<Worker>) {
    setForm((prev) => ({ ...prev, ...fields }))
  }

  async function saveBasic() {
    setSaving(true)
    try {
      await api.put(`/admin/workers/${id}`, {
        fullName: form.full_name,
        dateOfBirth: form.date_of_birth,
        gender: form.gender,
        bio: form.bio,
        primaryTradeId: form.primary_trade_id,
        experienceMonths: form.experience_months,
        profileComplete: form.profile_complete,
        idVerified: form.id_verified,
      })
      showToast('success', '저장되었습니다.')
    } catch {
      showToast('error', '저장 실패. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function saveDocs() {
    setSaving(true)
    try {
      await api.put(`/admin/workers/${id}`, {
        idNumber: form.id_number,
      })
      showToast('success', '저장되었습니다.')
    } catch {
      showToast('error', '저장 실패. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function saveBank() {
    setSaving(true)
    try {
      await api.put(`/admin/workers/${id}`, {
        bankName: form.bank_name,
        bankAccountNumber: form.bank_account_number,
      })
      showToast('success', '저장되었습니다.')
    } catch {
      showToast('error', '저장 실패. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSkills() {
    setSavingSkills(true)
    try {
      const skills = skillRows
        .filter((r) => r.tradeId !== '')
        .map((r) => ({ tradeId: r.tradeId, years: r.years }))
      await api.put(`/admin/workers/${id}/trade-skills`, { skills })
      showToast('success', '직종 기술이 저장되었습니다.')
    } catch {
      showToast('error', '저장 실패. 다시 시도해주세요.')
    } finally {
      setSavingSkills(false)
    }
  }

  async function handleDeactivate() {
    if (!confirm(`"${worker?.full_name}" 근로자를 비활성화하시겠습니까?`)) return
    setDeactivating(true)
    try {
      await api.delete(`/admin/workers/${id}`)
      navigate('/workers')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : '비활성화 실패')
    } finally {
      setDeactivating(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>
  if (!worker) return <div className="p-8 text-center text-[#D81A48]">근로자를 찾을 수 없습니다</div>

  return (
    <div className="p-8 max-w-2xl">
      <Link to="/workers" className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">← 목록으로</Link>

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
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#E6F0FE] flex items-center justify-center text-2xl font-bold text-[#0669F7]">
          {worker.full_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{worker.full_name}</h2>
            {worker.is_manager && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FDBC08]/20 text-yellow-700">관리자</span>
            )}
          </div>
          <p className="text-sm text-gray-500">{formatPhone(worker.phone)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            worker.id_verified ? 'bg-green-100 text-green-700' : 'bg-[#FDE8EE] text-[#D81A48]'
          }`}>
            {worker.id_verified ? '신분증 인증' : '미인증'}
          </span>
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className="px-3 py-1 text-xs border border-[#F4B0C0] rounded-xl text-[#D81A48] hover:bg-[#FDE8EE] disabled:opacity-50"
          >
            비활성화
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-[#EFF1F5] rounded-2xl p-1 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-2xl text-sm font-medium transition-all whitespace-nowrap ${
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
            <Field label="이름">
              <input className={INPUT} value={form.full_name ?? ''} onChange={(e) => patch({ full_name: e.target.value })} />
            </Field>
            <Field label="생년월일">
              <input type="date" className={INPUT} value={form.date_of_birth ?? ''} onChange={(e) => patch({ date_of_birth: e.target.value })} />
            </Field>
            <Field label="성별">
              <select className={INPUT} value={form.gender ?? ''} onChange={(e) => patch({ gender: e.target.value })}>
                <option value="">선택 안 함</option>
                <option value="MALE">남성</option>
                <option value="FEMALE">여성</option>
                <option value="OTHER">기타</option>
              </select>
            </Field>
            <Field label="자기소개">
              <textarea className={INPUT + ' resize-none'} rows={3} value={form.bio ?? ''} onChange={(e) => patch({ bio: e.target.value })} />
            </Field>
            <Field label="주요 직종 ID">
              <input type="number" className={INPUT} value={form.primary_trade_id ?? ''} onChange={(e) => patch({ primary_trade_id: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="경력 (개월)">
              <input type="number" className={INPUT} value={form.experience_months ?? ''} onChange={(e) => patch({ experience_months: Number(e.target.value) })} />
            </Field>
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.profile_complete ?? false}
                  onChange={(e) => patch({ profile_complete: e.target.checked })}
                  className="w-4 h-4 accent-[#0669F7]"
                />
                <span className="text-sm text-gray-700">프로필 완성</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.id_verified ?? false}
                  onChange={(e) => patch({ id_verified: e.target.checked })}
                  className="w-4 h-4 accent-[#0669F7]"
                />
                <span className="text-sm text-gray-700">신분증 인증</span>
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                  form.id_verified ? 'bg-green-100 text-green-700' : 'bg-[#FDE8EE] text-[#D81A48]'
                }`}>
                  {form.id_verified ? '인증됨' : '미인증'}
                </span>
              </label>
            </div>
            <SaveButton saving={saving} onClick={saveBasic} />
          </>
        )}

        {/* 신분증 / 서류 */}
        {tab === 'docs' && (
          <>
            <Field label="주민등록번호 / ID 번호">
              <input className={INPUT} value={form.id_number ?? ''} onChange={(e) => patch({ id_number: e.target.value })} />
            </Field>
            <Field label="인증일">
              <p className="text-sm text-gray-700 py-2">
                {worker.id_verified_at ? new Date(worker.id_verified_at).toLocaleString('ko-KR') : '미인증'}
              </p>
            </Field>

            <div className="border-t border-[#EFF1F5] pt-4 mt-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">첨부 이미지</h3>
              <div className="grid grid-cols-1 gap-5">
                <ImageField label="신분증 앞면" url={worker.id_front_url} />
                <ImageField label="신분증 뒷면" url={worker.id_back_url} />
                <ImageField label="통장사본" url={worker.bank_book_url} />
                <ImageField label="서명" url={worker.signature_url} />
              </div>
            </div>
            <SaveButton saving={saving} onClick={saveDocs} />
          </>
        )}

        {/* 은행 / 결제 */}
        {tab === 'bank' && (
          <>
            <Field label="은행명">
              <input className={INPUT} value={form.bank_name ?? ''} onChange={(e) => patch({ bank_name: e.target.value })} />
            </Field>
            <Field label="계좌번호">
              <input className={INPUT} value={form.bank_account_number ?? ''} onChange={(e) => patch({ bank_account_number: e.target.value })} />
            </Field>
            <SaveButton saving={saving} onClick={saveBank} />
          </>
        )}

        {/* 직종 / 기술 */}
        {tab === 'trades' && (
          <>
            {tradesLoading ? (
              <div className="py-8 text-center text-gray-400 text-sm">로딩 중...</div>
            ) : (
              <>
                {skillRows.length === 0 && (
                  <p className="text-sm text-gray-400 py-2">등록된 직종이 없습니다.</p>
                )}
                <div className="space-y-3">
                  {skillRows.map((row, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <select
                        className={INPUT + ' flex-1'}
                        value={row.tradeId}
                        onChange={(e) => {
                          const updated = [...skillRows]
                          updated[i] = { ...updated[i], tradeId: e.target.value ? Number(e.target.value) : '' }
                          setSkillRows(updated)
                        }}
                      >
                        <option value="">직종 선택</option>
                        {allTrades.map((t) => (
                          <option key={t.id} value={t.id}>{t.name_ko} ({t.code})</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          placeholder="경력(년)"
                          className={INPUT + ' w-24'}
                          value={row.years}
                          onChange={(e) => {
                            const updated = [...skillRows]
                            updated[i] = { ...updated[i], years: Number(e.target.value) }
                            setSkillRows(updated)
                          }}
                        />
                        <span className="text-xs text-gray-500">년</span>
                      </div>
                      <button
                        onClick={() => setSkillRows(skillRows.filter((_, j) => j !== i))}
                        className="text-[#D81A48] hover:text-[#D81A48] text-sm px-2"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSkillRows([...skillRows, { tradeId: '', years: 0 }])}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + 직종 추가
                </button>
                <div className="pt-2">
                  <button
                    onClick={saveSkills}
                    disabled={savingSkills}
                    className="w-full bg-[#0669F7] hover:bg-[#0550C4] text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm disabled:opacity-50"
                  >
                    {savingSkills ? '저장 중...' : '저장'}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* 관리자 정보 */}
        {tab === 'manager' && (
          <>
            {worker.is_manager ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-[#FDBC08]/20 text-yellow-700">관리자 활성</span>
                  {worker.manager_approved_at && (
                    <span className="text-xs text-gray-400">({new Date(worker.manager_approved_at).toLocaleDateString('ko-KR')} 승인)</span>
                  )}
                </div>
                {worker.manager_company_name && (
                  <ReadOnlyField label="회사명" value={worker.manager_company_name} />
                )}
                {worker.manager_representative_name && (
                  <ReadOnlyField label="담당자명" value={worker.manager_representative_name} />
                )}
                {worker.manager_profile_id && (
                  <div className="pt-2">
                    <a
                      href={`/managers/${worker.manager_profile_id}`}
                      className="inline-block text-sm text-[#0669F7] hover:underline font-medium"
                    >
                      관리자 프로필 상세 보기 →
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400 mb-4">이 근로자는 관리자 권한이 없습니다.</p>
                <a
                  href={`/managers/promote?workerId=${worker.id}`}
                  className="inline-block px-5 py-2.5 bg-[#0669F7] text-white text-sm font-semibold rounded-2xl hover:bg-[#0550C4] transition-colors"
                >
                  관리자로 지정하기 →
                </a>
              </div>
            )}
          </>
        )}

        {/* 기타 */}
        {tab === 'misc' && (
          <>
            <ReadOnlyField label="전화번호" value={formatPhone(worker.phone)} />
            <ReadOnlyField label="이메일" value={worker.email ?? '-'} />
            <div className="flex gap-4">
              <div className="flex-1">
                <ReadOnlyField label="위도 (lat)" value={worker.lat?.toString() ?? '-'} />
              </div>
              <div className="flex-1">
                <ReadOnlyField label="경도 (lng)" value={worker.lng?.toString() ?? '-'} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={worker.terms_accepted} readOnly className="w-4 h-4 accent-[#0669F7] cursor-default" />
                <span className="text-sm text-gray-600">이용약관 동의</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={worker.privacy_accepted} readOnly className="w-4 h-4 accent-[#0669F7] cursor-default" />
                <span className="text-sm text-gray-600">개인정보 처리방침 동의</span>
              </label>
            </div>
            <ReadOnlyField label="가입일" value={new Date(worker.created_at).toLocaleString('ko-KR')} />
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
