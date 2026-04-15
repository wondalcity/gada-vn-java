'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/lib/api/client'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { AccordionSection } from '@/components/ui/AccordionSection'
import type { Job, JobStatus } from '@/types/manager-site-job'

interface Trade {
  id: number
  name: string
  nameKo?: string
  nameVi?: string
  nameEn?: string
}

function getTradeName(tr: Trade, locale: string): string {
  if (locale === 'vi') return tr.nameVi ?? tr.nameKo ?? tr.name
  if (locale === 'en') return tr.nameEn ?? tr.nameKo ?? tr.name
  return tr.nameKo ?? tr.name
}

interface JobFormProps {
  mode: 'create' | 'edit'
  siteId: string
  siteName?: string
  jobId?: string
  initialData?: Partial<Job>
  locale: string
  idToken: string
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + ' ₫'
}

export default function JobForm({
  mode,
  siteId,
  siteName,
  jobId,
  initialData,
  locale,
  idToken,
}: JobFormProps) {
  const router = useRouter()
  const t = useTranslations('common.manager_job_form')

  const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
    { value: 'OPEN',      label: t('status_open') },
    { value: 'FILLED',    label: t('status_filled') },
    { value: 'CANCELLED', label: t('status_cancelled') },
    { value: 'COMPLETED', label: t('status_completed') },
  ]

  // Basic info
  const [title, setTitle] = React.useState(initialData?.title ?? '')
  const [titleVi, setTitleVi] = React.useState(initialData?.titleVi ?? '')
  const [tradeId, setTradeId] = React.useState<number | ''>(initialData?.tradeId ?? '')
  const [tradeSearch, setTradeSearch] = React.useState(initialData?.tradeName ?? '')
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [showTradeDropdown, setShowTradeDropdown] = React.useState(false)
  const [description, setDescription] = React.useState(initialData?.description ?? '')
  const [descriptionVi, setDescriptionVi] = React.useState(initialData?.descriptionVi ?? '')

  // Schedule
  const today = new Date().toISOString().split('T')[0]
  const [workDate, setWorkDate] = React.useState(initialData?.workDate ?? '')
  const [expiresAt, setExpiresAt] = React.useState(
    initialData?.expiresAt ? initialData.expiresAt.split('T')[0] : ''
  )
  const [startTime, setStartTime] = React.useState(initialData?.startTime ?? '')
  const [endTime, setEndTime] = React.useState(initialData?.endTime ?? '')

  // Pay
  const [dailyWage, setDailyWage] = React.useState<number | ''>(initialData?.dailyWage ?? '')
  const [slotsTotal, setSlotsTotal] = React.useState<number | ''>(initialData?.slotsTotal ?? '')

  // Benefits
  const [meals, setMeals] = React.useState(initialData?.benefits?.meals ?? false)
  const [transport, setTransport] = React.useState(initialData?.benefits?.transport ?? false)
  const [accommodation, setAccommodation] = React.useState(initialData?.benefits?.accommodation ?? false)
  const [insurance, setInsurance] = React.useState(initialData?.benefits?.insurance ?? false)

  // Requirements
  const [minExp, setMinExp] = React.useState<number | ''>(
    initialData?.requirements?.minExperienceMonths ?? ''
  )
  const [reqNotes, setReqNotes] = React.useState(initialData?.requirements?.notes ?? '')

  // Status (edit only)
  const [jobStatus, setJobStatus] = React.useState<JobStatus>(initialData?.status ?? 'OPEN')

  // Form state
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Load trades — update tradeSearch to locale-appropriate name after load
  React.useEffect(() => {
    apiClient<Trade[]>('/public/trades', { token: idToken })
      .then((res) => {
        setTrades(res.data)
        if (initialData?.tradeId) {
          const found = res.data.find((tr) => tr.id === initialData.tradeId)
          if (found) setTradeSearch(getTradeName(found, locale))
        }
      })
      .catch(() => {})
  }, [idToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTrades = trades.filter((tr) => {
    const search = tradeSearch.toLowerCase()
    return (
      (tr.nameKo ?? '').toLowerCase().includes(search) ||
      (tr.nameVi ?? '').toLowerCase().includes(search) ||
      (tr.nameEn ?? '').toLowerCase().includes(search) ||
      tr.name.toLowerCase().includes(search)
    )
  }).slice(0, 20)

  function selectTrade(tr: Trade) {
    setTradeId(tr.id)
    setTradeSearch(getTradeName(tr, locale))
    setShowTradeDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError(t('error_no_title')); return }
    if (!workDate) { setError(t('error_no_work_date')); return }
    if (!dailyWage || Number(dailyWage) <= 0) { setError(t('error_no_wage')); return }
    if (!slotsTotal || Number(slotsTotal) <= 0) { setError(t('error_no_slots')); return }

    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        titleVi: titleVi.trim() || undefined,
        tradeId: tradeId || undefined,
        description: description.trim() || undefined,
        descriptionVi: descriptionVi.trim() || undefined,
        workDate,
        expiresAt: expiresAt || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        dailyWage: Number(dailyWage),
        slotsTotal: Number(slotsTotal),
        benefits: { meals, transport, accommodation, insurance },
        requirements: {
          minExperienceMonths: minExp !== '' ? Number(minExp) : undefined,
          notes: reqNotes.trim() || undefined,
        },
      }

      if (mode === 'edit') {
        payload.status = jobStatus
      }

      if (mode === 'create') {
        const res = await apiClient<Job>(`/manager/sites/${siteId}/jobs`, {
          method: 'POST',
          token: idToken,
          body: JSON.stringify(payload),
        })
        router.push(`/manager/jobs/${res.data.id}`)
      } else {
        await apiClient<Job>(`/manager/jobs/${jobId}`, {
          method: 'PUT',
          token: idToken,
          body: JSON.stringify(payload),
        })
        router.push(`/manager/jobs/${jobId}`)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('error_save')
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white'
  const labelClass = 'block text-sm font-medium text-[#25282A] mb-1.5'

  const BENEFITS = [
    { key: 'meals',         label: t('benefit_meals'),         value: meals,         setter: setMeals },
    { key: 'transport',     label: t('benefit_transport'),     value: transport,     setter: setTransport },
    { key: 'accommodation', label: t('benefit_accommodation'), value: accommodation, setter: setAccommodation },
    { key: 'insurance',     label: t('benefit_insurance'),     value: insurance,     setter: setInsurance },
  ]

  return (
    <form onSubmit={handleSubmit} className="pb-10">
      {/* Desktop: two-column layout. Mobile: single column. */}
      <div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start">

        {/* ── Left column: Basic Info ── */}
        <div className="flex-1 min-w-0 space-y-4">
          <AccordionSection title={t('section_basic')}>
            {/* Title (Korean) */}
            <div>
              <label className={labelClass}>
                {t('title_ko_label')} <span className="text-[#ED1C24]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('title_ko_placeholder')}
                className={inputClass}
              />
            </div>

            {/* Title (Vietnamese) */}
            <div>
              <label className={labelClass}>
                {t('title_vi_label')}
                <span className="ml-1 text-xs font-normal text-[#98A2B2]">{t('shown_to_workers')}</span>
              </label>
              <input
                type="text"
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                placeholder={t('title_vi_placeholder')}
                className={inputClass}
              />
            </div>

            {/* Trade */}
            <div className="relative">
              <label className={labelClass}>{t('trade_label')}</label>
              <input
                type="text"
                value={tradeSearch}
                onChange={(e) => {
                  setTradeSearch(e.target.value)
                  setShowTradeDropdown(true)
                  if (!e.target.value) setTradeId('')
                }}
                onFocus={() => setShowTradeDropdown(true)}
                placeholder={t('trade_search_placeholder')}
                className={inputClass}
              />
              {showTradeDropdown && filteredTrades.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-[#EFF1F5] rounded-2xl shadow-lg max-h-48 overflow-y-auto mt-1">
                  {filteredTrades.map((tr) => (
                    <button
                      key={tr.id}
                      type="button"
                      onMouseDown={() => selectTrade(tr)}
                      className="w-full text-left px-3 py-2 text-sm text-[#25282A] hover:bg-[#F2F4F5]"
                    >
                      {getTradeName(tr, locale)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description (Korean) */}
            <div>
              <label className={labelClass}>{t('desc_ko_label')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder={t('desc_ko_placeholder')}
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-xs text-[#98A2B2] text-right">{description.length}/2000</p>
            </div>

            {/* Description (Vietnamese) */}
            <div>
              <label className={labelClass}>
                {t('desc_vi_label')}
                <span className="ml-1 text-xs font-normal text-[#98A2B2]">{t('shown_to_workers')}</span>
              </label>
              <textarea
                value={descriptionVi}
                onChange={(e) => setDescriptionVi(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder={t('desc_vi_placeholder')}
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-xs text-[#98A2B2] text-right">{descriptionVi.length}/2000</p>
            </div>
          </AccordionSection>
        </div>

        {/* ── Right column: schedule / pay / benefits / requirements ── */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-4 mt-4 lg:mt-0">

          {/* Schedule */}
          <AccordionSection title={t('section_schedule')}>
            {/* Work date */}
            <div>
              <label className={labelClass}>
                {t('work_date_label')} <span className="text-[#ED1C24]">*</span>
              </label>
              <DatePicker
                value={workDate}
                onChange={setWorkDate}
                min={today}
                placeholder={t('work_date_placeholder')}
                locale={locale}
              />
            </div>

            {/* Expires at */}
            <div>
              <label className={labelClass}>{t('deadline_label')}</label>
              <DatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                max={workDate || undefined}
                placeholder={t('deadline_placeholder')}
                locale={locale}
              />
              <p className="mt-1 text-xs text-[#98A2B2]">{t('deadline_hint')}</p>
            </div>

            {/* Start / End time */}
            <div>
              <label className={labelClass}>{t('work_hours_label')}</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    placeholder={t('start_time_placeholder')}
                  />
                </div>
                <span className="text-[#98A2B2] text-sm font-medium shrink-0">~</span>
                <div className="flex-1">
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    placeholder={t('end_time_placeholder')}
                  />
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Pay */}
          <AccordionSection title={t('section_pay')}>
            {/* Daily wage */}
            <div>
              <label className={labelClass}>
                {t('daily_wage_label')} <span className="text-[#ED1C24]">*</span>
              </label>
              <input
                type="number"
                value={dailyWage}
                onChange={(e) => setDailyWage(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="450000"
                min={0}
                className={inputClass}
              />
              {dailyWage !== '' && Number(dailyWage) > 0 && (
                <p className="mt-1.5 text-sm font-medium text-[#0669F7]">
                  {formatVND(Number(dailyWage))}
                </p>
              )}
            </div>

            {/* Slots total */}
            <div>
              <label className={labelClass}>
                {t('slots_label')} <span className="text-[#ED1C24]">*</span>
              </label>
              <input
                type="number"
                value={slotsTotal}
                onChange={(e) => setSlotsTotal(e.target.value === '' ? '' : Number(e.target.value))}
                min={1}
                placeholder="5"
                className={inputClass}
              />
            </div>
          </AccordionSection>

          {/* Benefits */}
          <AccordionSection title={t('section_benefits')} contentClassName="">
            <div className="grid grid-cols-2 gap-3">
              {BENEFITS.map((b) => (
                <label
                  key={b.key}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-colors ${
                    b.value
                      ? 'border-[#0669F7] bg-[#E6F0FE]'
                      : 'border-[#EFF1F5] bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={b.value}
                    onChange={(e) => b.setter(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-sm text-[#25282A] font-medium">{b.label}</span>
                </label>
              ))}
            </div>
          </AccordionSection>

          {/* Requirements */}
          <AccordionSection title={t('section_requirements')}>
            <div>
              <label className={labelClass}>{t('min_exp_label')}</label>
              <input
                type="number"
                value={minExp}
                onChange={(e) => setMinExp(e.target.value === '' ? '' : Number(e.target.value))}
                min={0}
                placeholder={t('min_exp_placeholder')}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('req_notes_label')}</label>
              <textarea
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                rows={3}
                placeholder={t('req_notes_placeholder')}
                className={`${inputClass} resize-none`}
              />
            </div>
          </AccordionSection>

          {/* Status (edit only) */}
          {mode === 'edit' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] px-5 py-4">
              <label className={labelClass}>{t('status_label')}</label>
              <select
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value as JobStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-2xl bg-[#FDE8EE] border border-[#F4A8B8] text-sm text-[#ED1C24]">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto sm:min-w-[120px] py-3.5 sm:py-2.5 px-6 rounded-full border-2 border-[#EFF1F5] text-[#25282A] font-semibold text-sm hover:border-[#98A2B2] active:bg-[#F8F8FA] transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto sm:min-w-[120px] py-3.5 sm:py-2.5 px-6 rounded-full bg-[#0669F7] text-white font-semibold text-sm hover:bg-[#0557D4] active:bg-[#0447BE] disabled:opacity-40 transition-colors shadow-md shadow-[#0669F7]/30"
        >
          {isSaving ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  )
}
