import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAdminTranslation } from '../context/LanguageContext'
import { fmtDateTime } from '../lib/dateUtils'

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
  updated_at?: string
  creator_name?: string
  creator_phone?: string
}


const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'
const LIMIT_OPTIONS = [10, 30, 50]

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
  const { t } = useAdminTranslation()
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
      setError(err instanceof Error ? err.message : t('common.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <h3 className="text-base font-bold text-gray-900 mb-4">{isEdit ? t('companies.modal.edit_title') : t('companies.modal.create_title')}</h3>
        {error && (
          <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('companies.modal.name')}</label>
            <input required className={IN} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('companies.modal.reg_no')}</label>
            <input className={IN} value={form.businessRegNo} onChange={e => setForm({ ...form, businessRegNo: e.target.value })} placeholder="000-00-00000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('companies.modal.contact_name')}</label>
            <input className={IN} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('companies.modal.contact_phone')}</label>
            <input className={IN} value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="0901 234 567" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('companies.modal.contact_email')}</label>
            <input type="email" className={IN} value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? t('companies.modal.saving') : isEdit ? t('companies.modal.save_edit') : t('companies.modal.save_create')}
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
  const { t } = useAdminTranslation()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sealUploading, setSealUploading] = useState(false)
  const [sealDeleting, setSealDeleting] = useState(false)
  const sealInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<Company>(`/admin/companies/${companyId}`)
      .then(data => setCompany(data))
      .catch(() => setError(t('companies.load_error')))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  useEffect(() => { load() }, [load])

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSaveEdit(data: Record<string, string>) {
    await api.put(`/admin/companies/${companyId}`, data)
    setShowEdit(false)
    showMsg(t('common.saved'))
    load()
  }

  async function handleDelete() {
    if (!confirm(t('companies.confirm_delete'))) return
    setDeleting(true)
    try {
      await api.delete(`/admin/companies/${companyId}`)
      onDeleted()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : t('common.delete_failed'))
    } finally {
      setDeleting(false)
    }
  }

  async function handleSealUpload(file: File) {
    setSealUploading(true)
    try {
      // Encode file as base64 and upload via admin proxy → Kotlin API → S3 (server-side)
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
      })
      await api.post(`/admin/companies/${companyId}/seal`, {
        fileData,
        contentType: file.type || 'image/png',
        fileName: file.name,
      })
      showMsg(t('companies.seal.uploaded'))
      load()
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      showMsg(apiMsg ?? (err instanceof Error ? err.message : t('companies.seal.upload_failed')))
    } finally {
      setSealUploading(false)
      if (sealInputRef.current) sealInputRef.current.value = ''
    }
  }

  async function handleSealDelete() {
    if (!confirm(t('companies.seal.confirm_delete'))) return
    setSealDeleting(true)
    try {
      await api.delete(`/admin/companies/${companyId}/seal`)
      showMsg(t('companies.seal.deleted'))
      load()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : t('common.delete_failed'))
    } finally {
      setSealDeleting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
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
        {t('companies.detail.back')}
      </button>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
            {company.business_reg_no && (
              <p className="text-sm text-gray-500">{t('companies.detail.reg_no_label')}{company.business_reg_no}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowEdit(true)} className="px-3 py-1.5 text-xs border border-[#EFF1F5] rounded-xl text-gray-600 hover:bg-[#F2F4F5]">{t('common.edit')}</button>
            <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-xs border border-[#F4B0C0] rounded-xl text-[#D81A48] hover:bg-[#FDE8EE] disabled:opacity-50">{t('common.delete')}</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('companies.detail.contact')}</p>
              <p className="text-sm font-medium text-gray-900">{company.contact_name ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('companies.detail.phone')}</p>
              <p className="text-sm font-medium text-gray-900">{formatPhone(company.contact_phone)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('companies.detail.email')}</p>
              <p className="text-sm font-medium text-gray-900">{company.contact_email ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('companies.detail.linked_sites')}</p>
              <p className="text-sm font-bold text-[#0669F7]">{company.site_count}{t('companies.detail.linked_sites_suffix')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('common.created_at')}</p>
              <p className="text-sm font-medium text-gray-900">{fmtDateTime(company.created_at)}</p>
            </div>
            {company.updated_at && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{t('common.updated_at')}</p>
                <p className="text-sm font-medium text-gray-900">{fmtDateTime(company.updated_at)}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Company seal / signature */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{t('companies.detail.signature')}</p>
                <div className="flex items-center gap-2">
                  <label
                    className={`cursor-pointer px-2.5 py-1 text-xs rounded-xl border border-[#0669F7] text-[#0669F7] hover:bg-[#E6F0FE] transition-colors ${sealUploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {sealUploading ? t('common.processing') : company.signature_url ? t('companies.seal.change') : t('companies.seal.upload')}
                    <input
                      ref={sealInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleSealUpload(file)
                      }}
                    />
                  </label>
                  {company.signature_url && (
                    <button
                      onClick={handleSealDelete}
                      disabled={sealDeleting}
                      className="px-2.5 py-1 text-xs rounded-xl border border-[#F4B0C0] text-[#D81A48] hover:bg-[#FDE8EE] disabled:opacity-50 transition-colors"
                    >
                      {sealDeleting ? t('common.processing') : t('common.delete')}
                    </button>
                  )}
                </div>
              </div>

              {company.signature_url ? (
                <div className="border border-[#EFF1F5] rounded-xl p-4 bg-[#FAFCFF] flex items-center justify-center min-h-[96px]">
                  <img
                    src={company.signature_url}
                    alt={t('companies.detail.signature_alt')}
                    className="max-h-24 max-w-[220px] object-contain"
                  />
                </div>
              ) : (
                <label className={`cursor-pointer block border-2 border-dashed border-[#E5E7EB] rounded-xl min-h-[96px] flex flex-col items-center justify-center gap-1.5 hover:border-[#0669F7] hover:bg-[#F0F6FF] transition-colors ${sealUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <svg className="w-6 h-6 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs text-[#98A2B2]">{sealUploading ? t('common.processing') : t('companies.seal.drop_hint')}</p>
                  <input
                    ref={sealInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleSealUpload(file)
                    }}
                  />
                </label>
              )}
            </div>

            {/* Business registration cert */}
            {company.business_reg_cert_url && (
              <div>
                <p className="text-xs text-gray-500 mb-2">{t('companies.detail.reg_cert')}</p>
                <a
                  href={company.business_reg_cert_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-xl border border-[#EFF1F5] text-[#0669F7] hover:bg-[#F0F6FF]"
                >
                  {t('companies.detail.view_reg_cert')}
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
  const { t, locale } = useAdminTranslation()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const [query, setQuery] = useState(search)
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback((q: string, p: number, l: number) => {
    if (id) return
    setLoading(true)
    api.get<{ data: Company[]; total: number }>(`/admin/companies?search=${encodeURIComponent(q)}&page=${p}&limit=${l}`)
      .then(res => {
        const arr = res.data ?? []
        setCompanies(arr)
        setTotal(res.total ?? arr.length)
      })
      .catch(() => {
        setCompanies([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load(search, page, limit) }, [search, page, limit, load])

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchParams({ search: query, page: '1', limit: String(limit) })
  }

  function goToPage(p: number) {
    setSearchParams({ search, page: String(p), limit: String(limit) })
  }

  async function handleCreate(data: Record<string, string>) {
    await api.post('/admin/companies', data)
    setShowCreate(false)
    showMsg(t('companies.registered'))
    load(search, page, limit)
  }

  async function handleEdit(data: Record<string, string>) {
    if (!editCompany) return
    await api.put(`/admin/companies/${editCompany.id}`, data)
    setEditCompany(null)
    showMsg(t('common.saved'))
    load(search, page, limit)
  }

  async function handleDelete(company: Company) {
    if (!confirm(`"${company.name}" ${t('companies.confirm_delete')}`)) return
    try {
      await api.delete(`/admin/companies/${company.id}`)
      setCompanies(prev => prev.filter(c => c.id !== company.id))
      setTotal(prev => prev - 1)
      showMsg(t('common.deleted'))
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : t('common.delete_failed'))
    }
  }

  if (id) {
    return (
      <CompanyDetailPanel
        companyId={id}
        onBack={() => navigate(-1)}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('companies.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('companies.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors"
        >
          {t('companies.new')}
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('companies.search_placeholder')}
          className="flex-1 border border-[#EFF1F5] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
        />
        <button type="submit" className="bg-[#0669F7] text-white px-4 py-2 rounded-2xl text-sm font-medium">{t('common.search')}</button>
        <select
          value={limit}
          onChange={(e) => setSearchParams({ search, page: '1', limit: e.target.value })}
          className="border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7] bg-white"
        >
          {LIMIT_OPTIONS.map(n => <option key={n} value={n}>{n}{t('common.per_page')}</option>)}
        </select>
      </form>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : companies.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-sm mb-4">{t('companies.empty')}</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0669F7] text-white text-sm font-medium rounded-2xl">{t('companies.first_register')}</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {[t('companies.col_name'), t('companies.col_reg_no'), t('companies.col_contact'), t('companies.col_phone'), t('companies.col_sites'), t('companies.col_signature'), t('companies.col_creator'), t('companies.col_registered'), ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-[#F2F4F5]">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:text-[#0669F7] whitespace-nowrap" onClick={() => navigate(`/companies/${c.id}`)}>
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{c.business_reg_no ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{c.contact_name ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatPhone(c.contact_phone)}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <span className="text-blue-600 font-medium">{c.site_count}</span>
                    <span className="text-gray-400">{t('companies.sites_suffix')}</span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {c.signature_url ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">{t('common.registered')}</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#EFF1F5] text-[#98A2B2] text-xs">{t('common.not_registered')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {c.creator_name ? (
                      <div>
                        <div className="font-medium">{c.creator_name}</div>
                        {c.creator_phone && <div className="text-xs text-gray-400">{formatPhone(c.creator_phone)}</div>}
                      </div>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{fmtDateTime(c.created_at)}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex gap-3 justify-end items-center">
                      <button onClick={() => navigate(`/companies/${c.id}`)} className="text-[#0669F7] hover:underline text-sm">{t('common.detail')}</button>
                        <>
                          <button onClick={e => { e.stopPropagation(); setEditCompany(c) }} className="text-gray-400 hover:text-gray-700 text-sm">{t('common.edit')}</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(c) }} className="text-[#D81A48] text-sm">{t('common.delete')}</button>
                        </>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
            className="px-3 py-1.5 rounded-xl text-sm border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5] disabled:opacity-40">‹</button>
          {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
            .filter(p => p === 1 || p === Math.ceil(total / limit) || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
              ) : (
                <button key={p} onClick={() => goToPage(p as number)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${p === page ? 'bg-[#0669F7] text-white border-[#0669F7] font-semibold' : 'border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]'}`}>
                  {p}
                </button>
              )
            )}
          <button onClick={() => goToPage(page + 1)} disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1.5 rounded-xl text-sm border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5] disabled:opacity-40">›</button>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-right">{t('companies.total').replace('{n}', String(total))}</div>
    </div>
  )
}
