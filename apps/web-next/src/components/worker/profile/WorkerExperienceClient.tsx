'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from '@/components/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface Experience {
  id: string
  companyName: string
  role: string
  startDate: string
  endDate: string | null
  description: string | null
}

interface ExperienceForm {
  companyName: string
  role: string
  startDate: string
  endDate: string
  description: string
}

const EMPTY_FORM: ExperienceForm = {
  companyName: '',
  role: '',
  startDate: '',
  endDate: '',
  description: '',
}

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short' }).format(new Date(d))
  return end ? `${fmt(start)} ~ ${fmt(end)}` : `${fmt(start)} ~ 현재`
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

export default function WorkerExperienceClient({ locale }: { locale: string }) {
  const { idToken } = useAuth()
  const t = useTranslations('common')
  const router = useRouter()

  const [experiences, setExperiences] = React.useState<Experience[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<ExperienceForm>(EMPTY_FORM)
  const [isSaving, setIsSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ── Toast auto-hide ─────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // ── Fetch experiences ───────────────────────────────────────────────────

  const fetchExperiences = React.useCallback(async () => {
    if (!idToken) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/workers/me/experiences`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setExperiences(json.data ?? [])
    } catch {
      setError(t('experience.fetch_error'))
    } finally {
      setIsLoading(false)
    }
  }, [idToken, t])

  React.useEffect(() => { fetchExperiences() }, [fetchExperiences])

  // ── Form handlers ───────────────────────────────────────────────────────

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(exp: Experience) {
    setEditingId(exp.id)
    setForm({
      companyName: exp.companyName,
      role: exp.role,
      startDate: exp.startDate?.slice(0, 7) ?? '',
      endDate: exp.endDate?.slice(0, 7) ?? '',
      description: exp.description ?? '',
    })
    setShowForm(true)
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idToken) return
    setIsSaving(true)
    try {
      const body = {
        companyName: form.companyName.trim(),
        role: form.role.trim(),
        startDate: form.startDate ? `${form.startDate}-01` : '',
        endDate: form.endDate ? `${form.endDate}-01` : null,
        description: form.description.trim() || null,
      }

      const url = editingId
        ? `${API_BASE}/workers/me/experiences/${editingId}`
        : `${API_BASE}/workers/me/experiences`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()

      setToast({ message: editingId ? t('experience.updated') : t('experience.created'), type: 'success' })
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await fetchExperiences()
    } catch {
      setToast({ message: t('experience.save_error'), type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!idToken) return
    setDeletingId(id)
    try {
      const res = await fetch(`${API_BASE}/workers/me/experiences/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) throw new Error()
      setExperiences(prev => prev.filter(e => e.id !== id))
      setToast({ message: t('experience.deleted'), type: 'success' })
    } catch {
      setToast({ message: t('experience.delete_error'), type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const inputCls = 'w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white'
  const labelCls = 'block text-sm font-medium text-[#25282A] mb-1'

  return (
    <div className="pb-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-md text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-[#D81A48]'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 py-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-[#25282A] hover:text-[#0669F7]"
        >
          <ChevronLeftIcon />
        </button>
        <h1 className="text-xl font-bold text-[#25282A] flex-1">{t('experience.title')}</h1>
        {!showForm && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0669F7] text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusIcon />
            {t('experience.add')}
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="mb-4 bg-white rounded-2xl border border-[#EFF1F5] p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#25282A] mb-4">
            {editingId ? t('experience.edit_title') : t('experience.add_title')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelCls}>{t('experience.company_name')} <span className="text-[#D81A48]">*</span></label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleFormChange}
                required
                placeholder={t('experience.placeholder_company')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('experience.role')} <span className="text-[#D81A48]">*</span></label>
              <input
                name="role"
                value={form.role}
                onChange={handleFormChange}
                required
                placeholder={t('experience.placeholder_role')}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('experience.start_date')} <span className="text-[#D81A48]">*</span></label>
                <input
                  type="month"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleFormChange}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('experience.end_date')}</label>
                <input
                  type="month"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleFormChange}
                  min={form.startDate}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('experience.description')}</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                rows={3}
                placeholder={t('experience.placeholder_description')}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="flex-1 py-2.5 rounded-full border border-[#DDDDDD] text-[#25282A] text-sm font-medium hover:border-[#25282A] transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-full bg-[#0669F7] text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {isSaving ? t('saving') : t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Experience list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#EFF1F5] p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-[#ED1C24] py-4">{error}</p>
      ) : experiences.length === 0 && !showForm ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-[#EFF1F5]">
          <p className="text-[#7A7B7A] text-sm mb-3">{t('experience.empty')}</p>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0669F7] text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusIcon />
            {t('experience.add')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {experiences.map(exp => (
            <div key={exp.id} className="bg-white rounded-2xl border border-[#EFF1F5] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#25282A] text-sm truncate">{exp.companyName}</p>
                  <p className="text-sm text-[#7A7B7A] mt-0.5">{exp.role}</p>
                  <p className="text-xs text-[#98A2B2] mt-1">{formatDateRange(exp.startDate, exp.endDate)}</p>
                  {exp.description && (
                    <p className="text-xs text-[#7A7B7A] mt-2 leading-relaxed">{exp.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(exp)}
                    className="p-2 text-[#7A7B7A] hover:text-[#0669F7] rounded-xl transition-colors"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(exp.id)}
                    disabled={deletingId === exp.id}
                    className="p-2 text-[#7A7B7A] hover:text-[#D81A48] rounded-xl transition-colors disabled:opacity-40"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
