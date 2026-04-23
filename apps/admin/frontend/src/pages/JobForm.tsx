import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { GadaDateInput, GadaSelect, GadaTimeInput } from '../components/ui/GadaFormControls'
import { useAdminTranslation } from '../context/LanguageContext'
import { tradeName as trdName } from '../lib/dateUtils'

interface Site { id: string; name: string; province?: string }
interface Trade { id: number; name_ko: string; name_vi?: string }

export default function JobForm() {
  const { t, locale } = useAdminTranslation()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    siteId: '', title: '', description: '', tradeId: '',
    workDate: '', startTime: '', endTime: '',
    dailyWage: '', slotsTotal: '1', status: 'OPEN',
  })
  const [benefits, setBenefits] = useState({ meals: false, transport: false, accommodation: false, insurance: false })
  const [requirements, setRequirements] = useState({ minExperienceMonths: '', notes: '' })
  const [siteSearch, setSiteSearch] = useState('')
  const [showSiteDropdown, setShowSiteDropdown] = useState(false)
  const siteDropdownRef = useRef<HTMLDivElement>(null)

  // Close site dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(e.target as Node)) {
        setShowSiteDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    Promise.all([
      api.get<Site[] | { data?: Site[] }>('/admin/sites'),
      api.get<Trade[]>('/admin/trades'),
      isEdit ? api.get<Record<string, unknown>>(`/admin/jobs/${id}`) : Promise.resolve(null),
    ]).then(([s, t, job]) => {
      setSites(Array.isArray(s) ? s : (Array.isArray((s as { data?: Site[] }).data) ? (s as { data: Site[] }).data : []))
      setTrades(Array.isArray(t) ? t : [])
      if (job) {
        setForm({
          siteId: String(job.site_id ?? ''),
          title: String(job.title ?? ''),
          description: String(job.description ?? ''),
          tradeId: String(job.trade_id ?? ''),
          workDate: String(job.work_date ?? '').slice(0, 10),
          startTime: String(job.start_time ?? ''),
          endTime: String(job.end_time ?? ''),
          dailyWage: String(job.daily_wage ?? ''),
          slotsTotal: String(job.slots_total ?? '1'),
          status: String(job.status ?? 'OPEN'),
        })
        const rawBenefits = parseJobJsonField(job.benefits)
        setBenefits({
          meals: !!rawBenefits.meals,
          transport: !!rawBenefits.transport,
          accommodation: !!rawBenefits.accommodation,
          insurance: !!rawBenefits.insurance,
        })
        const rawReqs = parseJobJsonField(job.requirements)
        setRequirements({
          minExperienceMonths: rawReqs.minExperienceMonths != null ? String(rawReqs.minExperienceMonths) : '',
          notes: rawReqs.notes != null ? String(rawReqs.notes) : '',
        })
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [id, isEdit])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        siteId: form.siteId,
        title: form.title,
        description: form.description || undefined,
        tradeId: form.tradeId ? Number(form.tradeId) : undefined,
        workDate: form.workDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        dailyWage: Number(form.dailyWage),
        slotsTotal: Number(form.slotsTotal),
        status: isEdit ? form.status : undefined,
        benefits: { meals: benefits.meals, transport: benefits.transport, accommodation: benefits.accommodation, insurance: benefits.insurance },
        requirements: {
          minExperienceMonths: requirements.minExperienceMonths ? Number(requirements.minExperienceMonths) : undefined,
          notes: requirements.notes || undefined,
        },
      }
      if (isEdit) {
        await api.put(`/admin/jobs/${id}`, payload)
        navigate('/jobs?flash=updated')
      } else {
        await api.post('/admin/jobs', payload)
        navigate('/jobs?flash=created')
      }
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(apiMsg ?? (err instanceof Error ? err.message : t('jobs.form.save_failed')))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">{t('jobs.form.loading')}</div>

  return (
    <div className="p-8 max-w-2xl">
      <Link to="/jobs" className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">{t('jobs.form.back')}</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? t('jobs.form.title_edit') : t('jobs.form.title_new')}</h1>

      {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-2xl p-3 mb-4 text-sm">{error}</div>}

      <form onSubmit={save} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <F label={t('jobs.form.field_site')}>
          {/* Searchable site selector */}
          <div className="relative" ref={siteDropdownRef}>
            <button
              type="button"
              onClick={() => { setShowSiteDropdown(v => !v); setSiteSearch('') }}
              className={`${IN} text-left flex items-center justify-between ${!form.siteId ? 'text-gray-400' : 'text-[#25282A]'}`}
            >
              <span className="truncate">
                {form.siteId
                  ? (() => { const s = sites.find(s => s.id === form.siteId); return s ? `${s.name}${s.province ? ` (${s.province})` : ''}` : t('jobs.form.site_placeholder') })()
                  : t('jobs.form.site_placeholder')}
              </span>
              <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {/* Hidden required input for form validation */}
            <input type="text" required value={form.siteId} onChange={() => {}} className="sr-only" tabIndex={-1} />
            {showSiteDropdown && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-[#EFF1F5] rounded-2xl shadow-lg overflow-hidden">
                <div className="p-2 border-b border-[#EFF1F5]">
                  <input
                    autoFocus
                    type="text"
                    className="w-full px-3 py-1.5 text-sm border border-[#EFF1F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                    placeholder={t('jobs.form.site_search_placeholder')}
                    value={siteSearch}
                    onChange={(e) => setSiteSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {sites.filter(s =>
                    s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
                    (s.province ?? '').toLowerCase().includes(siteSearch.toLowerCase())
                  ).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setForm({ ...form, siteId: s.id }); setShowSiteDropdown(false); setSiteSearch('') }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        form.siteId === s.id ? 'bg-[#E6F0FE] text-[#0669F7] font-medium' : 'text-[#25282A] hover:bg-[#F2F4F5]'
                      }`}
                    >
                      <span className="font-medium">{s.name}</span>
                      {s.province && <span className="text-gray-400 text-xs ml-1">({s.province})</span>}
                    </button>
                  ))}
                  {sites.filter(s =>
                    s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
                    (s.province ?? '').toLowerCase().includes(siteSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-4 text-sm text-gray-400 text-center">{t('jobs.form.site_no_results')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </F>
        <F label={t('jobs.form.field_title')}>
          <input required className={IN} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </F>
        <F label={t('jobs.form.field_trade')}>
          <GadaSelect value={form.tradeId} onChange={(e) => setForm({ ...form, tradeId: e.target.value })}>
            <option value="">{t('jobs.form.trade_none')}</option>
            {trades.map((tr) => <option key={tr.id} value={tr.id}>{trdName(tr.name_ko, tr.name_vi, locale)}</option>)}
          </GadaSelect>
        </F>
        <F label={t('jobs.form.field_work_date')}>
          <GadaDateInput required value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} locale={locale} />
        </F>
        <div className="grid grid-cols-2 gap-4">
          <F label={t('jobs.form.field_start_time')}><GadaTimeInput value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></F>
          <F label={t('jobs.form.field_end_time')}><GadaTimeInput value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></F>
        </div>
        <F label={t('jobs.form.field_daily_wage')}>
          <input required type="number" className={IN} value={form.dailyWage} onChange={(e) => setForm({ ...form, dailyWage: e.target.value })} />
        </F>
        <F label={t('jobs.form.field_slots_total')}>
          <input required type="number" min="1" className={IN} value={form.slotsTotal} onChange={(e) => setForm({ ...form, slotsTotal: e.target.value })} />
        </F>
        {isEdit && (
          <F label={t('jobs.form.field_status')}>
            <GadaSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="OPEN">{t('jobs.status_open')}</option>
              <option value="FILLED">{t('jobs.status_filled')}</option>
              <option value="CANCELLED">{t('jobs.status_cancelled')}</option>
            </GadaSelect>
          </F>
        )}
        <F label={t('jobs.form.field_description')}>
          <textarea className={IN + ' resize-none'} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </F>

        {/* Benefits */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">{t('jobs.form.field_benefits')}</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['meals',         t('jobs.form.benefit_meals')],
              ['transport',     t('jobs.form.benefit_transport')],
              ['accommodation', t('jobs.form.benefit_accommodation')],
              ['insurance',     t('jobs.form.benefit_insurance')],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={benefits[key]}
                  onChange={(e) => setBenefits({ ...benefits, [key]: e.target.checked })}
                  className="w-4 h-4 rounded border-[#EFF1F5] text-[#0669F7] accent-[#0669F7]"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500">{t('jobs.form.field_requirements')}</p>
          <F label={t('jobs.form.field_min_experience')}>
            <input
              type="number"
              min="0"
              className={IN}
              placeholder={t('jobs.form.field_min_experience_placeholder')}
              value={requirements.minExperienceMonths}
              onChange={(e) => setRequirements({ ...requirements, minExperienceMonths: e.target.value })}
            />
          </F>
          <F label={t('jobs.form.field_requirement_notes')}>
            <textarea
              className={IN + ' resize-none'}
              rows={2}
              placeholder={t('jobs.form.field_requirement_notes_placeholder')}
              value={requirements.notes}
              onChange={(e) => setRequirements({ ...requirements, notes: e.target.value })}
            />
          </F>
        </div>

        <button type="submit" disabled={saving} className="w-full bg-[#0669F7] hover:bg-[#0550C4] text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm disabled:opacity-50">
          {saving ? t('jobs.form.saving') : isEdit ? t('jobs.form.save_edit') : t('jobs.form.save_new')}
        </button>
      </form>
    </div>
  )
}

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>{children}</div>
}

function parseJobJsonField(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch {} }
  return {}
}
