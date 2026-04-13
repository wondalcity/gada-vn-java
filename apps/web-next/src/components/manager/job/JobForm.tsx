'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/navigation'
import { apiClient } from '@/lib/api/client'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { AccordionSection } from '@/components/ui/AccordionSection'
import type { Job, JobStatus } from '@/types/manager-site-job'

interface Trade {
  id: number
  name: string
  nameKo?: string
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

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'OPEN', label: '모집중' },
  { value: 'FILLED', label: '마감' },
  { value: 'CANCELLED', label: '취소' },
  { value: 'COMPLETED', label: '완료' },
]

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

  // Load trades
  React.useEffect(() => {
    apiClient<Trade[]>('/public/trades', { token: idToken })
      .then((res) => setTrades(res.data))
      .catch(() => {})
  }, [idToken])

  const filteredTrades = trades.filter((t) =>
    (t.nameKo ?? t.name).toLowerCase().includes(tradeSearch.toLowerCase())
  ).slice(0, 20)

  function selectTrade(t: Trade) {
    setTradeId(t.id)
    setTradeSearch(t.nameKo ?? t.name)
    setShowTradeDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError('직종/일자리 제목을 입력해주세요.'); return }
    if (!workDate) { setError('작업일을 선택해주세요.'); return }
    if (!dailyWage || Number(dailyWage) <= 0) { setError('일당을 입력해주세요.'); return }
    if (!slotsTotal || Number(slotsTotal) <= 0) { setError('채용 인원을 입력해주세요.'); return }

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
      const msg = e instanceof Error ? e.message : '저장에 실패했습니다.'
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white'
  const labelClass = 'block text-sm font-medium text-[#25282A] mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="pb-10">
      {/* Desktop: two-column layout. Mobile: single column. */}
      <div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start">

        {/* ── Left column: 기본 정보 ── */}
        <div className="flex-1 min-w-0 space-y-4">
          <AccordionSection title="기본 정보">
            {/* Title (Korean) */}
            <div>
              <label className={labelClass}>
                공고 제목 (한국어) <span className="text-[#ED1C24]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 도장공 모집"
                className={inputClass}
              />
            </div>

            {/* Title (Vietnamese) */}
            <div>
              <label className={labelClass}>
                공고 제목 (베트남어)
                <span className="ml-1 text-xs font-normal text-[#98A2B2]">근로자에게 표시됩니다</span>
              </label>
              <input
                type="text"
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                placeholder="예: Tuyển thợ sơn"
                className={inputClass}
              />
            </div>

            {/* Trade */}
            <div className="relative">
              <label className={labelClass}>직종 (공종)</label>
              <input
                type="text"
                value={tradeSearch}
                onChange={(e) => {
                  setTradeSearch(e.target.value)
                  setShowTradeDropdown(true)
                  if (!e.target.value) setTradeId('')
                }}
                onFocus={() => setShowTradeDropdown(true)}
                placeholder="직종 검색..."
                className={inputClass}
              />
              {showTradeDropdown && filteredTrades.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-[#EFF1F5] rounded-2xl shadow-lg max-h-48 overflow-y-auto mt-1">
                  {filteredTrades.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={() => selectTrade(t)}
                      className="w-full text-left px-3 py-2 text-sm text-[#25282A] hover:bg-[#F2F4F5]"
                    >
                      {t.nameKo ?? t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description (Korean) */}
            <div>
              <label className={labelClass}>상세 설명 (한국어)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="업무 내용, 특이사항 등을 자유롭게 작성해주세요"
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-xs text-[#98A2B2] text-right">{description.length}/2000</p>
            </div>

            {/* Description (Vietnamese) */}
            <div>
              <label className={labelClass}>
                상세 설명 (베트남어)
                <span className="ml-1 text-xs font-normal text-[#98A2B2]">근로자에게 표시됩니다</span>
              </label>
              <textarea
                value={descriptionVi}
                onChange={(e) => setDescriptionVi(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="예: Mô tả công việc, yêu cầu đặc biệt..."
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-xs text-[#98A2B2] text-right">{descriptionVi.length}/2000</p>
            </div>
          </AccordionSection>
        </div>

        {/* ── Right column: schedule / pay / benefits / requirements ── */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-4 mt-4 lg:mt-0">

          {/* 일정 */}
          <AccordionSection title="일정">
            {/* Work date */}
            <div>
              <label className={labelClass}>
                작업일 <span className="text-[#ED1C24]">*</span>
              </label>
              <DatePicker
                value={workDate}
                onChange={setWorkDate}
                min={today}
                placeholder="작업일 선택"
              />
            </div>

            {/* Expires at */}
            <div>
              <label className={labelClass}>모집 마감일</label>
              <DatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                max={workDate || undefined}
                placeholder="마감일 선택"
              />
              <p className="mt-1 text-xs text-[#98A2B2]">이 날짜 이후 지원이 불가합니다</p>
            </div>

            {/* Start / End time */}
            <div>
              <label className={labelClass}>근무 시간 (선택)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    placeholder="시작 시간"
                  />
                </div>
                <span className="text-[#98A2B2] text-sm font-medium shrink-0">~</span>
                <div className="flex-1">
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    placeholder="종료 시간"
                  />
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* 급여 */}
          <AccordionSection title="급여">
            {/* Daily wage */}
            <div>
              <label className={labelClass}>
                일당 (VND) <span className="text-[#ED1C24]">*</span>
              </label>
              <input
                type="number"
                value={dailyWage}
                onChange={(e) => setDailyWage(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="예: 450000"
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
                채용 인원 수 <span className="text-[#ED1C24]">*</span>
              </label>
              <input
                type="number"
                value={slotsTotal}
                onChange={(e) => setSlotsTotal(e.target.value === '' ? '' : Number(e.target.value))}
                min={1}
                placeholder="예: 5"
                className={inputClass}
              />
            </div>
          </AccordionSection>

          {/* 복리후생 */}
          <AccordionSection title="복리후생" contentClassName="">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'meals', label: '식사 제공', value: meals, setter: setMeals },
                { key: 'transport', label: '교통비 지원', value: transport, setter: setTransport },
                { key: 'accommodation', label: '숙박 제공', value: accommodation, setter: setAccommodation },
                { key: 'insurance', label: '산재보험', value: insurance, setter: setInsurance },
              ].map((b) => (
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

          {/* 자격요건 */}
          <AccordionSection title="자격요건" defaultOpen={false}>
            <div>
              <label className={labelClass}>최소 경력 (개월)</label>
              <input
                type="number"
                value={minExp}
                onChange={(e) => setMinExp(e.target.value === '' ? '' : Number(e.target.value))}
                min={0}
                placeholder="0 = 신입 가능"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>특이사항 또는 자격요건</label>
              <textarea
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                rows={3}
                placeholder="특이사항 또는 자격요건"
                className={`${inputClass} resize-none`}
              />
            </div>
          </AccordionSection>

          {/* Status (edit only) */}
          {mode === 'edit' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] px-5 py-4">
              <label className={labelClass}>상태</label>
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

      {/* Action buttons — stacked full-width on mobile, right-aligned on desktop */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto sm:min-w-[120px] py-3.5 sm:py-2.5 px-6 rounded-full border-2 border-[#EFF1F5] text-[#25282A] font-semibold text-sm hover:border-[#98A2B2] active:bg-[#F8F8FA] transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto sm:min-w-[120px] py-3.5 sm:py-2.5 px-6 rounded-full bg-[#0669F7] text-white font-semibold text-sm hover:bg-[#0557D4] active:bg-[#0447BE] disabled:opacity-40 transition-colors shadow-md shadow-[#0669F7]/30"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
