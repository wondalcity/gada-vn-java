'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import ConfirmModal from '@/components/manager/ConfirmModal'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface Props {
  jobId: string
  slug: string
  locale: string
  jobStatus: string
  expiresAt?: string
  isLoggedIn?: boolean
  initialApplicationId?: string
  initialApplicationStatus?: string
  initialNotes?: string
  /** When true, renders only the button element (no sticky wrapper). Used inside MobileApplyBar. */
  mobileInline?: boolean
}

type Phase =
  | 'idle'          // not yet applied
  | 'confirming'    // showing apply form (with optional note)
  | 'applying'      // POST in progress
  | 'applied'       // successfully applied — management panel
  | 'editing_note'  // editing the note inline
  | 'saving_note'   // PUT in progress
  | 'withdrawing'   // DELETE in progress
  | 'error'         // apply/withdraw error

const STATUS_LABEL_CLASSES: Record<string, string> = {
  APPLIED:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  HIRED:     'bg-green-50 text-green-700 border-green-200',
  COMPLETED: 'bg-blue-50 text-[#0669F7] border-blue-200',
  REJECTED:  'bg-red-50 text-[#ED1C24] border-red-200',
  WITHDRAWN: 'bg-gray-100 text-[#98A2B2] border-[#EFF1F5]',
}

export default function ApplyButton({
  jobId, slug, locale, jobStatus, expiresAt,
  isLoggedIn = false,
  initialApplicationId, initialApplicationStatus, initialNotes,
  mobileInline = false,
}: Props) {
  // isLoggedIn is determined server-side and passed as prop to avoid
  // hydration mismatch (getSessionCookie() returns null during SSR).
  // Actual token is read inside event handlers where document is available.
  const t = useTranslations('jobs')
  const router = useRouter()

  const [phase, setPhase] = React.useState<Phase>(initialApplicationId ? 'applied' : 'idle')
  const [appId, setAppId] = React.useState(initialApplicationId)
  const [appStatus, setAppStatus] = React.useState(initialApplicationStatus ?? '')
  const [note, setNote] = React.useState(initialNotes ?? '')
  const [draftNote, setDraftNote] = React.useState(initialNotes ?? '')
  const [errorMsg, setErrorMsg] = React.useState('')
  const [showWithdrawConfirm, setShowWithdrawConfirm] = React.useState(false)

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false
  const isJobOpen = jobStatus === 'OPEN' && !isExpired

  // Can cancel: only while APPLIED (검토중) and job still OPEN
  const canWithdraw = isJobOpen && appStatus === 'APPLIED'

  // ── Apply ────────────────────────────────────────────────────────
  async function handleApply() {
    const idToken = getSessionCookie()
    if (!idToken) {
      router.push(`/login?redirect=/jobs/${slug}`)
      return
    }
    setPhase('applying')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note.trim() || undefined }),
      })
      if (res.status === 201) {
        const body = await res.json()
        setAppId(body?.data?.id)
        setAppStatus('APPLIED')
        setPhase('applied')
        return
      }
      const body = await res.json()
      const code = body.code ?? body.error ?? ''
      const errorKey = code === 'ALREADY_APPLIED' ? 'apply_btn.error.already_applied'
        : code === 'JOB_FULL' ? 'apply_btn.error.job_full'
        : code === 'JOB_NOT_OPEN' ? 'apply_btn.error.job_not_open'
        : null
      setErrorMsg(errorKey ? t(errorKey as any) : (body.message ?? t('apply_btn.error.apply_generic')))
      setPhase('error')
    } catch {
      setErrorMsg(t('apply_btn.error.apply_generic'))
      setPhase('error')
    }
  }

  // ── Save note ────────────────────────────────────────────────────
  async function handleSaveNote() {
    const idToken = getSessionCookie()
    if (!idToken || !appId) return
    setPhase('saving_note')
    try {
      const res = await fetch(`${API_BASE}/applications/${appId}/note`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: draftNote.trim() }),
      })
      if (res.ok) {
        setNote(draftNote.trim())
        setPhase('applied')
      } else {
        setPhase('applied')
      }
    } catch {
      setPhase('applied')
    }
  }

  // ── Withdraw ─────────────────────────────────────────────────────
  async function handleWithdraw() {
    const idToken = getSessionCookie()
    if (!idToken || !appId) return
    setPhase('withdrawing')
    try {
      const res = await fetch(`${API_BASE}/applications/${appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (res.ok || res.status === 200) {
        // Reset — worker can re-apply
        setAppId(undefined)
        setAppStatus('')
        setNote('')
        setDraftNote('')
        setPhase('idle')
        return
      }
      const body = await res.json().catch(() => ({}))
      setErrorMsg(body.message ?? t('apply_btn.error.cancel_generic'))
      setPhase('applied')
    } catch {
      setErrorMsg(t('apply_btn.error.cancel_generic'))
      setPhase('applied')
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Render helpers
  // ════════════════════════════════════════════════════════════════

  const statusBadgeClass = appStatus ? STATUS_LABEL_CLASSES[appStatus] : null
  const statusBadgeLabel = appStatus ? (() => {
    switch (appStatus) {
      case 'APPLIED':   return t('apply_btn.status.applied')
      case 'HIRED':     return t('apply_btn.status.hired')
      case 'COMPLETED': return t('apply_btn.status.completed')
      case 'REJECTED':  return t('apply_btn.status.rejected')
      case 'WITHDRAWN': return t('apply_btn.status.withdrawn')
      default:          return appStatus
    }
  })() : null

  // Sticky bar: sits ABOVE the tab bar using CSS variable, falls back to bottom:0 on public pages
  const stickyClass = 'fixed left-0 right-0 p-4 bg-white border-t border-[#EFF1F5] shadow-lg z-40'
  const stickyStyle = { bottom: 'calc(var(--tab-bar-height, 0px) + env(safe-area-inset-bottom, 0px))' }

  // Management panel (shown after applying)
  function renderAppliedPanel(sticky = false) {
    const base = sticky ? stickyClass : 'mt-6 bg-white rounded-2xl p-5'
    const baseStyle = sticky ? stickyStyle : { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

    if (phase === 'editing_note' || phase === 'saving_note') {
      return (
        <div className={base} style={sticky ? stickyStyle : baseStyle}>
          <p className="text-xs text-[#98A2B2] mb-1.5 font-medium">{t('apply_btn.note_edit_section')}</p>
          <textarea
            value={draftNote}
            onChange={e => setDraftNote(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder={t('apply_btn.note_placeholder')}
            className="w-full text-sm border border-[#EFF1F5] rounded-2xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0669F7]/30 mb-4"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setDraftNote(note); setPhase('applied') }}
              className="flex-1 h-14 rounded-2xl bg-[#EFF1F5] text-[#25282A] text-sm font-bold"
            >
              {t('apply_btn.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={phase === 'saving_note'}
              className="flex-1 h-14 rounded-2xl bg-[#0669F7] text-white text-sm font-bold disabled:opacity-50"
            >
              {phase === 'saving_note' ? t('apply_btn.saving') : t('apply_btn.save')}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={base} style={sticky ? stickyStyle : baseStyle}>
        {/* Status row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold text-[#25282A]">{t('apply_btn.applied_title')}</span>
          </div>
          {statusBadgeClass && statusBadgeLabel && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadgeClass}`}>
              {statusBadgeLabel}
            </span>
          )}
        </div>

        {/* Note preview */}
        {note && (
          <div className="flex items-start justify-between gap-2 mb-4 bg-[#F2F4F5] rounded-2xl px-3 py-3">
            <p className="text-xs text-[#98A2B2] leading-relaxed flex-1">{note}</p>
            {canWithdraw && (
              <button
                type="button"
                onClick={() => { setDraftNote(note); setPhase('editing_note') }}
                className="shrink-0 text-xs text-[#0669F7] font-bold"
              >
                수정
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href={'/worker/applications'}
            className="text-center h-14 flex items-center justify-center rounded-2xl bg-[#E6F0FE] text-[#0669F7] text-sm font-bold hover:bg-[#D6E8FE] transition-colors"
          >
            {t('apply_btn.view_applications')}
          </Link>

          {canWithdraw && (
            <div className={`flex gap-3 ${sticky ? '' : 'flex-row'}`}>
              <button
                type="button"
                onClick={() => setShowWithdrawConfirm(true)}
                disabled={phase === 'withdrawing'}
                className={`flex-1 rounded-2xl bg-[#FDE8EE] text-[#ED1C24] text-sm font-bold hover:bg-[#FCD0DC] transition-colors disabled:opacity-40 ${sticky ? 'h-14' : 'h-11'}`}
              >
                {phase === 'withdrawing' ? t('apply_btn.withdrawing') : t('apply_btn.withdraw')}
              </button>

              {!note && (
                <button
                  type="button"
                  onClick={() => setPhase('editing_note')}
                  className={`flex-1 rounded-2xl bg-[#EFF1F5] text-[#98A2B2] text-sm font-bold hover:bg-[#E4E8EE] transition-colors ${sticky ? 'h-14' : 'h-11'}`}
                >
                  {t('apply_btn.add_message')}
                </button>
              )}
            </div>
          )}
        </div>

        {errorMsg && <p className="text-xs text-[#ED1C24] mt-3 text-center">{errorMsg}</p>}
      </div>
    )
  }

  // Apply form with optional note
  function renderApplyForm(sticky = false) {
    const base = sticky ? stickyClass : 'mt-6 bg-white rounded-2xl p-5 flex flex-col gap-4'
    const baseStyle = sticky ? stickyStyle : { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
    const isLoading = phase === 'applying'

    if (phase === 'confirming') {
      return (
        <div className={base} style={sticky ? stickyStyle : baseStyle}>
          <p className="text-xs text-[#98A2B2] font-medium">{t('apply_btn.note_section')}</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder={t('apply_btn.note_placeholder')}
            className="w-full text-sm border border-[#EFF1F5] rounded-2xl px-3 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#0669F7]/30"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="flex-1 h-14 rounded-2xl bg-[#EFF1F5] text-[#25282A] text-sm font-bold"
            >
              {t('apply_btn.cancel')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 h-14 rounded-2xl bg-[#0669F7] text-white text-sm font-bold"
            >
              {t('apply_btn.confirm')}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={base} style={sticky ? stickyStyle : baseStyle}>
        <button
          type="button"
          onClick={() => setPhase('confirming')}
          disabled={isLoading}
          className={`${sticky ? 'w-full' : ''} h-14 px-5 rounded-2xl bg-[#0669F7] text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2`}
        >
          {isLoading && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {t('apply_btn.apply')}
        </button>
        {phase === 'error' && <p className={`text-sm text-[#ED1C24] ${sticky ? 'text-center mt-2' : ''}`}>{errorMsg}</p>}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // mobileInline — renders only the button, no sticky wrapper
  // ════════════════════════════════════════════════════════════════
  if (mobileInline) {
    if (!isLoggedIn) {
      return (
        <button
          type="button"
          onClick={() => router.push(`/login?redirect=/jobs/${slug}`)}
          className="h-12 px-5 rounded-2xl bg-[#0669F7] text-white font-bold text-sm whitespace-nowrap"
        >
          {t('apply_btn.login_required')}
        </button>
      )
    }
    if (!isJobOpen && phase !== 'applied') {
      return (
        <button type="button" disabled
          className="h-12 px-5 rounded-2xl bg-[#0669F7] text-white font-bold text-sm disabled:opacity-40 whitespace-nowrap"
        >
          {isExpired ? t('apply_btn.deadline_expired') : t('card.status.filled')}
        </button>
      )
    }
    if (phase === 'applied' || phase === 'editing_note' || phase === 'saving_note' || phase === 'withdrawing') {
      return (
        <>
          <button
            type="button"
            onClick={() => router.push('/worker/applications')}
            className="h-12 px-5 rounded-2xl bg-[#E6F0FE] text-[#0669F7] font-bold text-sm whitespace-nowrap"
          >
            {t('apply_btn.applications_status')}
          </button>
          <ConfirmModal
            isOpen={showWithdrawConfirm}
            title="지원 취소"
            message="지원을 취소하시겠습니까? 취소 후에는 다시 지원할 수 있습니다."
            confirmLabel="취소하기"
            confirmVariant="danger"
            onConfirm={() => { setShowWithdrawConfirm(false); handleWithdraw() }}
            onCancel={() => setShowWithdrawConfirm(false)}
            isLoading={phase === 'withdrawing'}
          />
        </>
      )
    }
    // idle / confirming / applying / error
    return (
      <>
        <button
          type="button"
          onClick={() => setPhase('confirming')}
          disabled={phase === 'applying'}
          className="h-12 px-5 rounded-2xl bg-[#0669F7] text-white font-bold text-sm disabled:opacity-40 whitespace-nowrap flex items-center gap-2"
        >
          {phase === 'applying' && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {t('apply_btn.apply')}
        </button>

        {/* Confirming bottom sheet (mobile inline mode) */}
        {phase === 'confirming' && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setPhase('idle')} />
            <div className="relative bg-white rounded-t-3xl p-6 flex flex-col gap-4 animate-slide-up">
              <div className="w-10 h-1 rounded-full bg-[#D0D4DB] mx-auto -mt-1 mb-1" />
              <p className="text-[15px] font-bold text-[#25282A]">{t('apply_btn.confirm_title')}</p>
              <p className="text-xs text-[#98A2B2] -mt-1 font-medium">{t('apply_btn.note_section')}</p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder={t('apply_btn.note_placeholder')}
                className="w-full text-sm border border-[#EFF1F5] rounded-2xl px-3 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#0669F7]/30"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPhase('idle')}
                  className="flex-1 h-14 rounded-2xl bg-[#EFF1F5] text-[#25282A] text-sm font-bold"
                >
                  {t('apply_btn.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 h-14 rounded-2xl bg-[#0669F7] text-white text-sm font-bold"
                >
                  {t('apply_btn.confirm')}
                </button>
              </div>
              <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
            </div>
          </div>
        )}
        {phase === 'error' && <p className="text-sm text-[#ED1C24] text-center mt-2">{errorMsg}</p>}
      </>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // Guest
  // ════════════════════════════════════════════════════════════════
  if (!isLoggedIn) {
    const loginBtn = (sticky: boolean) => (
      <div
        className={sticky ? stickyClass : 'mt-6'}
        style={sticky ? stickyStyle : undefined}
      >
        <button
          type="button"
          onClick={() => router.push(`/login?redirect=/jobs/${slug}`)}
          className={`${sticky ? 'w-full' : ''} h-14 px-5 rounded-2xl bg-[#0669F7] text-white font-bold text-sm`}
        >
          {t('apply_btn.login_required')}
        </button>
      </div>
    )
    return <>{loginBtn(false)}{loginBtn(true)}</>
  }

  // ════════════════════════════════════════════════════════════════
  // Job closed/expired
  // ════════════════════════════════════════════════════════════════
  if (!isJobOpen && phase !== 'applied') {
    const closedBtn = (sticky: boolean) => (
      <div
        className={sticky ? stickyClass : 'mt-6'}
        style={sticky ? stickyStyle : undefined}
      >
        <button type="button" disabled
          className={`${sticky ? 'w-full' : ''} h-14 px-5 rounded-2xl bg-[#0669F7] text-white font-bold text-sm disabled:opacity-40`}
        >
          {isExpired ? t('apply_btn.deadline_expired') : t('apply_btn.job_closed')}
        </button>
      </div>
    )
    return <>{closedBtn(false)}{closedBtn(true)}</>
  }

  // ════════════════════════════════════════════════════════════════
  // Applied — management panel
  // ════════════════════════════════════════════════════════════════
  if (phase === 'applied' || phase === 'editing_note' || phase === 'saving_note' || phase === 'withdrawing') {
    return (
      <>
        <div className="hidden md:block">{renderAppliedPanel(false)}</div>
        <div className="md:hidden">{renderAppliedPanel(true)}</div>
        <ConfirmModal
          isOpen={showWithdrawConfirm}
          title={t('apply_btn.withdraw_modal.title')}
          message={t('apply_btn.withdraw_modal.message')}
          confirmLabel={t('apply_btn.withdraw_modal.confirm')}
          confirmVariant="danger"
          onConfirm={() => { setShowWithdrawConfirm(false); handleWithdraw() }}
          onCancel={() => setShowWithdrawConfirm(false)}
          isLoading={phase === 'withdrawing'}
        />
      </>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // Idle / confirming / applying / error
  // ════════════════════════════════════════════════════════════════
  return (
    <>
      <div className="hidden md:block">{renderApplyForm(false)}</div>
      <div className="md:hidden">{renderApplyForm(true)}</div>
    </>
  )
}
