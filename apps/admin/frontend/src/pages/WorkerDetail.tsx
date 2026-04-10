import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAdminTranslation } from '../context/LanguageContext'
import { GadaSelect, GadaDateInput } from '../components/ui/GadaFormControls'

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

export default function WorkerDetail() {
  const { t } = useAdminTranslation()
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

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'basic', label: t('worker_detail.tab_basic') },
    { key: 'docs', label: t('worker_detail.tab_docs') },
    { key: 'bank', label: t('worker_detail.tab_bank') },
    { key: 'trades', label: t('worker_detail.tab_trades') },
    { key: 'manager', label: t('worker_detail.tab_manager') },
    { key: 'misc', label: t('worker_detail.tab_misc') },
  ]

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
      showToast('success', t('worker_detail.save_success'))
    } catch {
      showToast('error', t('worker_detail.save_failed'))
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
      showToast('success', t('worker_detail.save_success'))
    } catch {
      showToast('error', t('worker_detail.save_failed'))
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
      showToast('success', t('worker_detail.save_success'))
    } catch {
      showToast('error', t('worker_detail.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function saveMisc() {
    setSaving(true)
    try {
      await api.put(`/admin/workers/${id}`, {
        phone: form.phone,
      })
      setWorker((prev) => prev ? { ...prev, phone: form.phone ?? prev.phone } : prev)
      showToast('success', t('worker_detail.save_success'))
    } catch {
      showToast('error', t('worker_detail.save_failed'))
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
      showToast('success', t('worker_detail.skills_saved'))
    } catch {
      showToast('error', t('worker_detail.save_failed'))
    } finally {
      setSavingSkills(false)
    }
  }

  async function handleDeactivate() {
    if (!confirm(`"${worker?.full_name}" ${t('worker_detail.confirm_deactivate')}`)) return
    setDeactivating(true)
    try {
      await api.delete(`/admin/workers/${id}`)
      navigate('/workers')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : t('worker_detail.deactivate_failed'))
    } finally {
      setDeactivating(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>
  if (!worker) return <div className="p-8 text-center text-[#D81A48]">{t('worker_detail.not_found')}</div>

  return (
    <div className="p-8 max-w-2xl">
      <Link to="/workers" className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">{t('common.back_to_list')}</Link>

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
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FDBC08]/20 text-yellow-700">{t('worker_detail.manager_badge')}</span>
            )}
          </div>
          <p className="text-sm text-gray-500">{formatPhone(worker.phone)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            worker.id_verified ? 'bg-green-100 text-green-700' : 'bg-[#FDE8EE] text-[#D81A48]'
          }`}>
            {worker.id_verified ? t('worker_detail.id_verified') : t('worker_detail.id_unverified')}
          </span>
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className="px-3 py-1 text-xs border border-[#F4B0C0] rounded-xl text-[#D81A48] hover:bg-[#FDE8EE] disabled:opacity-50"
          >
            {t('common.deactivate')}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-[#EFF1F5] rounded-2xl p-1 mb-5 overflow-x-auto">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex-1 py-2 px-3 rounded-2xl text-sm font-medium transition-all whitespace-nowrap ${
              tab === tabItem.key ? 'bg-white shadow-sm text-[#0669F7] font-semibold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">

        {/* Basic Info */}
        {tab === 'basic' && (
          <>
            <Field label={t('worker_detail.field_name')}>
              <input className={INPUT} value={form.full_name ?? ''} onChange={(e) => patch({ full_name: e.target.value })} />
            </Field>
            <Field label={t('worker_detail.field_dob')}>
              <GadaDateInput value={form.date_of_birth ?? ''} onChange={(e) => patch({ date_of_birth: e.target.value })} />
            </Field>
            <Field label={t('worker_detail.field_gender')}>
              <GadaSelect value={form.gender ?? ''} onChange={(e) => patch({ gender: e.target.value })}>
                <option value="">{t('worker_detail.field_gender_none')}</option>
                <option value="MALE">{t('worker_detail.field_gender_male')}</option>
                <option value="FEMALE">{t('worker_detail.field_gender_female')}</option>
                <option value="OTHER">{t('worker_detail.field_gender_other')}</option>
              </GadaSelect>
            </Field>
            <Field label={t('worker_detail.field_bio')}>
              <textarea className={INPUT + ' resize-none'} rows={3} value={form.bio ?? ''} onChange={(e) => patch({ bio: e.target.value })} />
            </Field>
            <Field label={t('worker_detail.field_trade_id')}>
              <input type="number" className={INPUT} value={form.primary_trade_id ?? ''} onChange={(e) => patch({ primary_trade_id: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label={t('worker_detail.field_experience')}>
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
                <span className="text-sm text-gray-700">{t('worker_detail.profile_complete')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.id_verified ?? false}
                  onChange={(e) => patch({ id_verified: e.target.checked })}
                  className="w-4 h-4 accent-[#0669F7]"
                />
                <span className="text-sm text-gray-700">{t('worker_detail.id_verified_check')}</span>
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                  form.id_verified ? 'bg-green-100 text-green-700' : 'bg-[#FDE8EE] text-[#D81A48]'
                }`}>
                  {form.id_verified ? t('worker_detail.id_verified_badge') : t('worker_detail.id_unverified_badge')}
                </span>
              </label>
            </div>
            <SaveButton saving={saving} onClick={saveBasic} label={t('common.save')} savingLabel={t('common.saving')} />
          </>
        )}

        {/* ID / Documents */}
        {tab === 'docs' && (
          <>
            <Field label={t('worker_detail.field_id_number')}>
              <input className={INPUT} value={form.id_number ?? ''} onChange={(e) => patch({ id_number: e.target.value })} />
            </Field>
            <Field label={t('worker_detail.field_verified_at')}>
              <p className="text-sm text-gray-700 py-2">
                {worker.id_verified_at ? new Date(worker.id_verified_at).toLocaleString('ko-KR') : t('worker_detail.unverified_date')}
              </p>
            </Field>

            <div className="border-t border-[#EFF1F5] pt-4 mt-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('worker_detail.attachments_title')}</h3>
              <div className="grid grid-cols-1 gap-5">
                <ImageField label={t('worker_detail.field_id_front')} url={worker.id_front_url} notRegisteredLabel={t('common.not_registered')} />
                <ImageField label={t('worker_detail.field_id_back')} url={worker.id_back_url} notRegisteredLabel={t('common.not_registered')} />
                <ImageField label={t('worker_detail.field_bank_book')} url={worker.bank_book_url} notRegisteredLabel={t('common.not_registered')} />
                <ImageField label={t('worker_detail.field_signature')} url={worker.signature_url} notRegisteredLabel={t('common.not_registered')} />
              </div>
            </div>
            <SaveButton saving={saving} onClick={saveDocs} label={t('common.save')} savingLabel={t('common.saving')} />
          </>
        )}

        {/* Bank / Payment */}
        {tab === 'bank' && (
          <>
            <Field label={t('worker_detail.field_bank_name')}>
              <input className={INPUT} value={form.bank_name ?? ''} onChange={(e) => patch({ bank_name: e.target.value })} />
            </Field>
            <Field label={t('worker_detail.field_bank_account')}>
              <input className={INPUT} value={form.bank_account_number ?? ''} onChange={(e) => patch({ bank_account_number: e.target.value })} />
            </Field>
            <SaveButton saving={saving} onClick={saveBank} label={t('common.save')} savingLabel={t('common.saving')} />
          </>
        )}

        {/* Trades / Skills */}
        {tab === 'trades' && (
          <>
            {tradesLoading ? (
              <div className="py-8 text-center text-gray-400 text-sm">{t('worker_detail.trades_loading')}</div>
            ) : (
              <>
                {skillRows.length === 0 && (
                  <p className="text-sm text-gray-400 py-2">{t('worker_detail.trades_empty')}</p>
                )}
                <div className="space-y-3">
                  {skillRows.map((row, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <GadaSelect
                        className="flex-1"
                        value={row.tradeId}
                        onChange={(e) => {
                          const updated = [...skillRows]
                          updated[i] = { ...updated[i], tradeId: e.target.value ? Number(e.target.value) : '' }
                          setSkillRows(updated)
                        }}
                      >
                        <option value="">{t('worker_detail.trade_select')}</option>
                        {allTrades.map((tr) => (
                          <option key={tr.id} value={tr.id}>{tr.name_ko} ({tr.code})</option>
                        ))}
                      </GadaSelect>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          placeholder={t('worker_detail.experience_years_placeholder')}
                          className={INPUT + ' w-24'}
                          value={row.years}
                          onChange={(e) => {
                            const updated = [...skillRows]
                            updated[i] = { ...updated[i], years: Number(e.target.value) }
                            setSkillRows(updated)
                          }}
                        />
                        <span className="text-xs text-gray-500">{t('worker_detail.experience_years_suffix')}</span>
                      </div>
                      <button
                        onClick={() => setSkillRows(skillRows.filter((_, j) => j !== i))}
                        className="text-[#D81A48] hover:text-[#D81A48] text-sm px-2"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSkillRows([...skillRows, { tradeId: '', years: 0 }])}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {t('worker_detail.trade_add')}
                </button>
                <div className="pt-2">
                  <button
                    onClick={saveSkills}
                    disabled={savingSkills}
                    className="w-full bg-[#0669F7] hover:bg-[#0550C4] text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm disabled:opacity-50"
                  >
                    {savingSkills ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Manager Info */}
        {tab === 'manager' && (
          <>
            {worker.is_manager ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-[#FDBC08]/20 text-yellow-700">{t('worker_detail.manager_active')}</span>
                  {worker.manager_approved_at && (
                    <span className="text-xs text-gray-400">({new Date(worker.manager_approved_at).toLocaleDateString('ko-KR')} {t('worker_detail.approved_suffix')})</span>
                  )}
                </div>
                {worker.manager_company_name && (
                  <ReadOnlyField label={t('worker_detail.field_company')} value={worker.manager_company_name} />
                )}
                {worker.manager_representative_name && (
                  <ReadOnlyField label={t('worker_detail.field_contact_name')} value={worker.manager_representative_name} />
                )}
                {worker.manager_profile_id && (
                  <div className="pt-2">
                    <a
                      href={`/managers/${worker.manager_profile_id}`}
                      className="inline-block text-sm text-[#0669F7] hover:underline font-medium"
                    >
                      {t('worker_detail.manager_profile_link')}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400 mb-4">{t('worker_detail.no_manager')}</p>
                <a
                  href={`/managers/promote?workerId=${worker.id}`}
                  className="inline-block px-5 py-2.5 bg-[#0669F7] text-white text-sm font-semibold rounded-2xl hover:bg-[#0550C4] transition-colors"
                >
                  {t('worker_detail.promote_link')}
                </a>
              </div>
            )}
          </>
        )}

        {/* Other */}
        {tab === 'misc' && (
          <>
            <Field label={t('worker_detail.field_phone')}>
              <input className={INPUT} value={form.phone ?? ''} onChange={(e) => patch({ phone: e.target.value })} placeholder="+84901234567" />
            </Field>
            <ReadOnlyField label={t('worker_detail.field_email')} value={worker.email ?? '-'} />
            <div className="flex gap-4">
              <div className="flex-1">
                <ReadOnlyField label={t('worker_detail.field_lat')} value={worker.lat?.toString() ?? '-'} />
              </div>
              <div className="flex-1">
                <ReadOnlyField label={t('worker_detail.field_lng')} value={worker.lng?.toString() ?? '-'} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={worker.terms_accepted} readOnly className="w-4 h-4 accent-[#0669F7] cursor-default" />
                <span className="text-sm text-gray-600">{t('worker_detail.terms_accepted')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={worker.privacy_accepted} readOnly className="w-4 h-4 accent-[#0669F7] cursor-default" />
                <span className="text-sm text-gray-600">{t('worker_detail.privacy_accepted')}</span>
              </label>
            </div>
            <ReadOnlyField label={t('worker_detail.field_joined')} value={new Date(worker.created_at).toLocaleString('ko-KR')} />
            <SaveButton saving={saving} onClick={saveMisc} label={t('common.save')} savingLabel={t('common.saving')} />
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

function ImageField({ label, url, notRegisteredLabel }: { label: string; url: string | null | undefined; notRegisteredLabel: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">{label}</label>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={label} className="max-w-xs rounded border border-[#EFF1F5] hover:opacity-90 transition-opacity" />
        </a>
      ) : (
        <div className="inline-block px-3 py-1.5 bg-[#EFF1F5] text-[#98A2B2] text-xs rounded-2xl border border-[#EFF1F5]">{notRegisteredLabel}</div>
      )}
    </div>
  )
}

function SaveButton({ saving, onClick, label, savingLabel }: { saving: boolean; onClick: () => void; label: string; savingLabel: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="w-full bg-[#0669F7] hover:bg-[#0550C4] text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm disabled:opacity-50"
    >
      {saving ? savingLabel : label}
    </button>
  )
}
