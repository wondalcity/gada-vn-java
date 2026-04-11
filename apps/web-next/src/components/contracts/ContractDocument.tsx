'use client'

import * as React from 'react'
import type { Contract } from '@/types/contract'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function fmtShortDate(d?: string | null) {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`
}

function fmtVND(n?: number | null) {
  if (n == null) return '-'
  return new Intl.NumberFormat('ko-KR').format(n) + ' VND'
}

// ── Row component for the detail table ───────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td
        style={{
          width: '30%',
          padding: '7px 10px',
          backgroundColor: '#F5F7FA',
          borderRight: '1px solid #CCCCCC',
          borderBottom: '1px solid #CCCCCC',
          fontSize: '12px',
          fontWeight: 600,
          color: '#444',
          whiteSpace: 'nowrap',
          verticalAlign: 'top',
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: '7px 10px',
          borderBottom: '1px solid #CCCCCC',
          fontSize: '12px',
          color: '#222',
          verticalAlign: 'top',
        }}
      >
        {value}
      </td>
    </tr>
  )
}

function SectionHeader({ children }: { children: string }) {
  return (
    <tr>
      <td
        colSpan={2}
        style={{
          padding: '8px 10px',
          backgroundColor: '#1a4fa0',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.03em',
        }}
      >
        {children}
      </td>
    </tr>
  )
}

// ── Main Contract Document ────────────────────────────────────────────────────

const DOC_WIDTH = 680

interface Props {
  contract: Contract
  documentRef?: React.RefObject<HTMLDivElement>
  previewWorkerSigUrl?: string | null
  previewManagerSigUrl?: string | null
}

export function ContractDocument({ contract, documentRef, previewWorkerSigUrl, previewManagerSigUrl }: Props) {
  const contractNo = contract.id.slice(0, 8).toUpperCase()
  const issuedDate = fmtShortDate(contract.createdAt)

  // Responsive scale: shrink to fit container width on mobile, max 1× on desktop
  const outerRef = React.useRef<HTMLDivElement>(null)
  const scaleRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = scaleRef.current
    if (!outer || !inner) return

    const update = () => {
      const containerWidth = outer.clientWidth
      if (!containerWidth) return
      const newScale = Math.min(1, containerWidth / DOC_WIDTH)
      inner.style.transform = `scale(${newScale})`
      inner.style.transformOrigin = 'top center'
      outer.style.height = `${inner.offsetHeight * newScale}px`
    }

    const ro = new ResizeObserver(update)
    ro.observe(outer)
    update()
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={outerRef} style={{ width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <div ref={scaleRef} style={{ width: `${DOC_WIDTH}px` }}>
        <div
          ref={documentRef}
          style={{
            width: `${DOC_WIDTH}px`,
            backgroundColor: '#ffffff',
            fontFamily: "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif",
            color: '#222222',
            padding: '40px 48px',
            boxSizing: 'border-box',
          }}
        >
      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        {/* GADA brand */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#0669F7', letterSpacing: '-0.5px' }}>
            GADA
          </span>
          <span style={{ fontSize: '11px', marginLeft: '6px', color: '#666', fontWeight: 400 }}>
            베트남 건설 근로자 매칭 플랫폼
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'inline-block',
            borderTop: '2px solid #1a4fa0',
            borderBottom: '2px solid #1a4fa0',
            padding: '8px 32px',
            fontSize: '20px',
            fontWeight: 800,
            letterSpacing: '4px',
            color: '#1a4fa0',
          }}
        >
          근 로 계 약 서
        </div>

        {/* Contract meta */}
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#888', display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <span>계약번호: {contractNo}</span>
          <span>발행일: {issuedDate}</span>
        </div>
      </div>

      {/* ── Intro text ── */}
      <p style={{ fontSize: '12px', lineHeight: '1.8', color: '#444', marginBottom: '20px', textAlign: 'justify' }}>
        근로자(이하 "갑")와 건설사(이하 "을")는 아래와 같이 근로계약을 체결하고 이를 성실히 이행할 것을 확약합니다.
      </p>

      {/* ── Detail table ── */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #CCCCCC',
          marginBottom: '20px',
          fontSize: '12px',
        }}
      >
        <tbody>
          {/* 현장 정보 */}
          <SectionHeader>■ 현장 정보</SectionHeader>
          <Row label="현장명" value={contract.siteName} />
          {contract.siteAddress && <Row label="현장 주소" value={contract.siteAddress} />}

          {/* 근무 조건 */}
          <SectionHeader>■ 근무 조건</SectionHeader>
          <Row label="업무 내용" value={contract.jobTitle} />
          <Row label="근무 일자" value={fmtDate(contract.workDate)} />
          {(contract.startTime || contract.endTime) && (
            <Row
              label="근무 시간"
              value={`${contract.startTime ?? '00:00'} ~ ${contract.endTime ?? '00:00'}`}
            />
          )}
          <Row
            label="일당"
            value={
              <span style={{ fontWeight: 700, color: '#0669F7', fontSize: '13px' }}>
                {fmtVND(contract.dailyWage)}
              </span>
            }
          />
          <Row label="임금 지급" value="근로 완료 후 당일 또는 익영업일 내 지급" />

          {/* 근로자 정보 */}
          <SectionHeader>■ 근로자 정보 (갑)</SectionHeader>
          <Row label="성명" value={contract.workerName ?? '-'} />
          {contract.workerPhone && <Row label="연락처" value={contract.workerPhone} />}

          {/* 건설사 정보 */}
          <SectionHeader>■ 건설사 정보 (을)</SectionHeader>
          {contract.companyName ? (
            <>
              <Row label="건설사명" value={contract.companyName} />
              {contract.companyContactName && <Row label="담당자" value={contract.companyContactName} />}
              {contract.companyContactPhone && <Row label="연락처" value={contract.companyContactPhone} />}
            </>
          ) : (
            <>
              <Row label="성명" value={contract.managerName ?? '-'} />
              {contract.managerPhone && <Row label="연락처" value={contract.managerPhone} />}
            </>
          )}
        </tbody>
      </table>

      {/* ── Terms ── */}
      <div
        style={{
          border: '1px solid #CCCCCC',
          borderRadius: '3px',
          padding: '14px 16px',
          backgroundColor: '#FAFAFA',
          marginBottom: '24px',
        }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#1a4fa0', marginBottom: '8px' }}>
          ■ 계약 조건 및 준수 사항
        </p>
        <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', lineHeight: '2', color: '#555' }}>
          <li>근로자는 지정된 근무 시간에 현장에 출근하여 성실하게 근무하여야 합니다.</li>
          <li>건설사는 근로기준법에 따라 안전한 근무 환경을 제공하여야 합니다.</li>
          <li>합의된 일당은 근로 완료 확인 후 지체 없이 지급합니다.</li>
          <li>근로자 또는 건설사의 귀책 사유로 인한 계약 불이행 시 GADA 플랫폼 운영 정책에 따릅니다.</li>
          <li>본 계약에 명시되지 않은 사항은 근로기준법 및 관련 법령에 따릅니다.</li>
        </ol>
      </div>

      {/* ── Signature section ── */}
      <div
        style={{
          border: '1px solid #CCCCCC',
          borderRadius: '3px',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#1a4fa0', marginBottom: '16px' }}>
          ■ 서명란 — 본 계약서의 내용을 충분히 숙지하고 동의하여 서명합니다.
        </p>

        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Worker signature box */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                border: '1px solid #CCCCCC',
                borderRadius: '3px',
                backgroundColor: '#FAFAFA',
                padding: '12px',
                minHeight: '130px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#444', marginBottom: '4px' }}>
                갑 (근로자)
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                성명: {contract.workerName ?? '_________________'}
              </div>

              {/* Signature image or placeholder */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTop: '1px dashed #CCCCCC',
                  paddingTop: '8px',
                  minHeight: '70px',
                  position: 'relative',
                }}
              >
                {(previewWorkerSigUrl ?? contract.workerSigUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(previewWorkerSigUrl ?? contract.workerSigUrl)!}
                    alt="근로자 서명"
                    style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
                    crossOrigin="anonymous"
                  />
                ) : contract.workerSignedAt ? (
                  <div style={{ textAlign: 'center' }}>
                    <svg style={{ width: '22px', height: '22px', color: '#1a4fa0', margin: '0 auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span style={{ fontSize: '10px', color: '#1a4fa0', fontWeight: 700 }}>서명 완료</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: '#BBB', fontStyle: 'italic' }}>
                    서명 대기 중
                  </span>
                )}
              </div>

              {contract.workerSignedAt && (
                <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                  서명일: {fmtShortDate(contract.workerSignedAt)}
                </div>
              )}
            </div>
          </div>

          {/* Manager/Company signature box */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                border: '1px solid #CCCCCC',
                borderRadius: '3px',
                backgroundColor: '#FAFAFA',
                padding: '12px',
                minHeight: '130px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#444', marginBottom: '4px' }}>
                을 (건설사)
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                {contract.companyName
                  ? `건설사: ${contract.companyName}`
                  : `담당관리자: ${contract.managerName ?? '_________________'}`
                }
              </div>

              {/* Company seal — shown only when registered; blank otherwise */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTop: '1px dashed #CCCCCC',
                  paddingTop: '8px',
                  minHeight: '70px',
                }}
              >
                {(previewManagerSigUrl ?? contract.companySigUrl ?? contract.managerSigUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(previewManagerSigUrl ?? contract.companySigUrl ?? contract.managerSigUrl)!}
                    alt="건설사 직인"
                    style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
                    crossOrigin="anonymous"
                  />
                ) : null}
              </div>

              {contract.managerSignedAt && (previewManagerSigUrl ?? contract.companySigUrl ?? contract.managerSigUrl) && (
                <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                  날인일: {fmtShortDate(contract.managerSignedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#AAA', borderTop: '1px solid #EEE', paddingTop: '12px' }}>
        본 계약서는 GADA 플랫폼(gada.vn)을 통해 전자적으로 체결되었습니다. · 계약번호: {contractNo}
      </div>
        </div>
      </div>
    </div>
  )
}

// ── Download button ───────────────────────────────────────────────────────────

interface DownloadButtonProps {
  documentRef: React.RefObject<HTMLDivElement | null>
  contractId: string
  disabled?: boolean
}

export function ContractDownloadButton({ documentRef, contractId, disabled }: DownloadButtonProps) {
  const [isGenerating, setIsGenerating] = React.useState(false)

  async function handleDownload() {
    const el = documentRef.current
    if (!el) return
    setIsGenerating(true)
    // Temporarily reset scale transform so html2canvas captures at full 680px resolution
    const scaleEl = el.parentElement as HTMLElement | null
    const outerEl = scaleEl?.parentElement as HTMLElement | null
    const savedTransform = scaleEl?.style.transform ?? ''
    const savedHeight = outerEl?.style.height ?? ''
    if (scaleEl) scaleEl.style.transform = 'none'
    if (outerEl) { outerEl.style.overflow = 'visible'; outerEl.style.height = 'auto' }
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `계약서_${contractId.slice(0, 8).toUpperCase()}.png`
      a.click()
    } finally {
      // Restore scale transform
      if (scaleEl) scaleEl.style.transform = savedTransform
      if (outerEl) { outerEl.style.overflow = 'hidden'; outerEl.style.height = savedHeight }
      setIsGenerating(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled || isGenerating}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-[#0557D4] disabled:opacity-40 transition-colors"
    >
      {isGenerating ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          이미지 생성 중...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          이미지로 저장
        </>
      )}
    </button>
  )
}
