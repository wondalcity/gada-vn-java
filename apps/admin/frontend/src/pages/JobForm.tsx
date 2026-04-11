import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { GadaSelect, GadaDateInput, GadaTimeInput } from '../components/ui/GadaFormControls'
import { useAdminTranslation } from '../context/LanguageContext'

interface Site { id: string; name: string; province?: string }
interface Trade { id: number; name_ko: string }

export default function JobForm() {
  const { t } = useAdminTranslation()
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

  useEffect(() => {
    Promise.all([
      api.get<Site[]>('/admin/sites'),
      api.get<Trade[]>('/admin/trades'),
      isEdit ? api.get<Record<string, unknown>>(`/admin/jobs/${id}`) : Promise.resolve(null),
    ]).then(([s, t, job]) => {
      setSites(Array.isArray(s) ? s : [])
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
          <GadaSelect required value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}>
            <option value="">{t('jobs.form.site_placeholder')}</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name} {s.province ? `(${s.province})` : ''}</option>)}
          </GadaSelect>
        </F>
        <F label={t('jobs.form.field_title')}>
          <input required className={IN} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </F>
        <F label={t('jobs.form.field_trade')}>
          <GadaSelect value={form.tradeId} onChange={(e) => setForm({ ...form, tradeId: e.target.value })}>
            <option value="">{t('jobs.form.trade_none')}</option>
            {trades.map((tr) => <option key={tr.id} value={tr.id}>{tr.name_ko}</option>)}
          </GadaSelect>
        </F>
        <F label={t('jobs.form.field_work_date')}>
          <GadaDateInput required value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} />
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
