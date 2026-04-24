'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import type { Contract } from '@/types/contract'
import { formatDate, formatDateShort } from '@/lib/utils/date'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtVND(n?: number | null) {
  if (n == null) return '-'
  return new Intl.NumberFormat('ko-KR').format(n) + ' VND'
}

// ── Multilingual contract strings ─────────────────────────────────────────────

const CONTRACT_STRINGS = {
  ko: {
    brand_sub:        '베트남 건설 근로자 매칭 플랫폼',
    title:            '근 로 계 약 서',
    contract_no:      '계약번호',
    issued_date:      '발행일',
    intro:            '근로자(이하 "갑")와 건설사(이하 "을")는 아래와 같이 근로계약을 체결하고 이를 성실히 이행할 것을 확약합니다.',
    sec_site:         '■ 현장 정보',
    label_site_name:  '현장명',
    label_site_addr:  '현장 주소',
    sec_work:         '■ 근무 조건',
    label_job:        '업무 내용',
    label_work_date:  '근무 일자',
    label_work_time:  '근무 시간',
    label_wage:       '일당',
    label_pay_method: '임금 지급',
    pay_method_val:   '근로 완료 후 당일 또는 익영업일 내 지급',
    sec_worker:       '■ 근로자 정보 (갑)',
    label_name:       '성명',
    label_phone:      '연락처',
    sec_company:      '■ 건설사 정보 (을)',
    label_company:    '건설사명',
    label_contact:    '담당자',
    terms_title:      '■ 계약 조건 및 준수 사항',
    terms: [
      '근로자는 지정된 근무 시간에 현장에 출근하여 성실하게 근무하여야 합니다.',
      '건설사는 근로기준법에 따라 안전한 근무 환경을 제공하여야 합니다.',
      '합의된 일당은 근로 완료 확인 후 지체 없이 지급합니다.',
      '근로자 또는 건설사의 귀책 사유로 인한 계약 불이행 시 GADA 플랫폼 운영 정책에 따릅니다.',
      '본 계약에 명시되지 않은 사항은 근로기준법 및 관련 법령에 따릅니다.',
    ],
    sig_title:        '■ 서명란 — 본 계약서의 내용을 충분히 숙지하고 동의하여 서명합니다.',
    party_a:          '갑 (근로자)',
    party_b:          '을 (건설사)',
    name_prefix:      '성명',
    company_prefix:   '건설사',
    manager_prefix:   '담당관리자',
    sig_done:         '서명 완료',
    sig_pending:      '서명 대기 중',
    sig_date:         '서명일',
    stamp_date:       '날인일',
    footer:           '본 계약서는 GADA 플랫폼(gada.vn)을 통해 전자적으로 체결되었습니다.',
    contract_no_label:'계약번호',
    btn_save:         '이미지로 저장',
    btn_saving:       '이미지 생성 중...',
    filename_prefix:  '계약서',
  },
  vi: {
    brand_sub:        'Nền tảng kết nối lao động xây dựng Việt Nam',
    title:            'HỢP ĐỒNG LAO ĐỘNG',
    contract_no:      'Số hợp đồng',
    issued_date:      'Ngày phát hành',
    intro:            'Người lao động (gọi là "Bên A") và công ty xây dựng (gọi là "Bên B") đồng ý ký kết hợp đồng lao động theo các điều khoản dưới đây và cam kết thực hiện đầy đủ.',
    sec_site:         '■ Thông tin công trường',
    label_site_name:  'Tên công trường',
    label_site_addr:  'Địa chỉ công trường',
    sec_work:         '■ Điều kiện làm việc',
    label_job:        'Nội dung công việc',
    label_work_date:  'Ngày làm việc',
    label_work_time:  'Giờ làm việc',
    label_wage:       'Lương ngày',
    label_pay_method: 'Thanh toán lương',
    pay_method_val:   'Thanh toán trong ngày hoặc ngày làm việc tiếp theo sau khi hoàn thành công việc',
    sec_worker:       '■ Thông tin người lao động (Bên A)',
    label_name:       'Họ và tên',
    label_phone:      'Số điện thoại',
    sec_company:      '■ Thông tin công ty xây dựng (Bên B)',
    label_company:    'Tên công ty',
    label_contact:    'Người phụ trách',
    terms_title:      '■ Điều khoản và điều kiện hợp đồng',
    terms: [
      'Người lao động phải đến công trường đúng giờ làm việc đã quy định và làm việc nghiêm túc.',
      'Công ty xây dựng phải cung cấp môi trường làm việc an toàn theo quy định của Bộ luật Lao động.',
      'Tiền lương ngày đã thỏa thuận sẽ được thanh toán ngay sau khi xác nhận hoàn thành công việc.',
      'Trường hợp vi phạm hợp đồng do lỗi của người lao động hoặc công ty xây dựng, sẽ xử lý theo chính sách vận hành của nền tảng GADA.',
      'Các vấn đề không được đề cập trong hợp đồng này sẽ tuân theo Bộ luật Lao động và các quy định pháp luật liên quan.',
    ],
    sig_title:        '■ Ký tên — Tôi đã đọc kỹ và đồng ý với nội dung hợp đồng này.',
    party_a:          'Bên A (Người lao động)',
    party_b:          'Bên B (Công ty XD)',
    name_prefix:      'Họ tên',
    company_prefix:   'Công ty',
    manager_prefix:   'Quản lý phụ trách',
    sig_done:         'Đã ký',
    sig_pending:      'Đang chờ ký',
    sig_date:         'Ngày ký',
    stamp_date:       'Ngày đóng dấu',
    footer:           'Hợp đồng này được ký kết điện tử thông qua nền tảng GADA (gada.vn).',
    contract_no_label:'Số hợp đồng',
    btn_save:         'Lưu hình ảnh',
    btn_saving:       'Đang tạo ảnh...',
    filename_prefix:  'hop-dong',
  },
  en: {
    brand_sub:        'Vietnam Construction Worker Matching Platform',
    title:            'LABOR CONTRACT',
    contract_no:      'Contract No.',
    issued_date:      'Issued Date',
    intro:            'The worker (hereinafter "Party A") and the construction company (hereinafter "Party B") agree to enter into this labor contract under the terms set forth below and pledge to fulfill all obligations in good faith.',
    sec_site:         '■ Site Information',
    label_site_name:  'Site Name',
    label_site_addr:  'Site Address',
    sec_work:         '■ Work Conditions',
    label_job:        'Job Description',
    label_work_date:  'Work Date',
    label_work_time:  'Work Hours',
    label_wage:       'Daily Wage',
    label_pay_method: 'Wage Payment',
    pay_method_val:   'Paid on the day of work completion or the following business day',
    sec_worker:       '■ Worker Information (Party A)',
    label_name:       'Full Name',
    label_phone:      'Phone',
    sec_company:      '■ Company Information (Party B)',
    label_company:    'Company Name',
    label_contact:    'Contact Person',
    terms_title:      '■ Contract Terms and Conditions',
    terms: [
      'The worker must report to the worksite at the designated work hours and perform duties diligently.',
      'The construction company must provide a safe working environment in accordance with the Labor Code.',
      'The agreed daily wage will be paid promptly after confirmation of work completion.',
      'In the event of contract breach by either the worker or the company, the GADA platform operating policy shall apply.',
      'Matters not specified in this contract shall be governed by the Labor Code and applicable laws.',
    ],
    sig_title:        '■ Signatures — I have fully read and agree to the contents of this contract.',
    party_a:          'Party A (Worker)',
    party_b:          'Party B (Company)',
    name_prefix:      'Name',
    company_prefix:   'Company',
    manager_prefix:   'Manager',
    sig_done:         'Signed',
    sig_pending:      'Pending Signature',
    sig_date:         'Signed Date',
    stamp_date:       'Stamped Date',
    footer:           'This contract was concluded electronically via the GADA platform (gada.vn).',
    contract_no_label:'Contract No.',
    btn_save:         'Save as Image',
    btn_saving:       'Generating...',
    filename_prefix:  'contract',
  },
} as const

type SupportedLang = keyof typeof CONTRACT_STRINGS

function getLang(lang?: string): SupportedLang {
  if (lang === 'vi' || lang === 'en') return lang
  return 'ko'
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

// ── Language selector ─────────────────────────────────────────────────────────

const LANG_OPTIONS: { value: SupportedLang; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

export function ContractLangSelector({
  lang,
  onChange,
}: {
  lang: SupportedLang
  onChange: (l: SupportedLang) => void
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <svg className="w-3.5 h-3.5 text-[#7A7B7A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span className="text-xs text-[#7A7B7A] shrink-0">계약서 언어:</span>
      <div className="flex rounded-lg border border-[#DDDDDD] overflow-hidden">
        {LANG_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              lang === opt.value
                ? 'bg-[#0669F7] text-white'
                : 'bg-white text-[#7A7B7A] hover:bg-[#F5F7FA] hover:text-[#25282A]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Contract Document ────────────────────────────────────────────────────

const DOC_WIDTH = 680

interface Props {
  contract: Contract
  documentRef?: React.RefObject<HTMLDivElement>
  previewWorkerSigUrl?: string | null
  previewManagerSigUrl?: string | null
  lang?: string
}

export function ContractDocument({ contract, documentRef, previewWorkerSigUrl, previewManagerSigUrl, lang }: Props) {
  const locale = useLocale()
  const s = CONTRACT_STRINGS[getLang(lang ?? locale)]
  const contractNo = contract.id.slice(0, 8).toUpperCase()
  const issuedDate = formatDateShort(contract.createdAt, locale)

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
            {s.brand_sub}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'inline-block',
            borderTop: '2px solid #1a4fa0',
            borderBottom: '2px solid #1a4fa0',
            padding: '8px 32px',
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: getLang(lang ?? locale) === 'ko' ? '4px' : '1px',
            color: '#1a4fa0',
          }}
        >
          {s.title}
        </div>

        {/* Contract meta */}
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#888', display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <span>{s.contract_no}: {contractNo}</span>
          <span>{s.issued_date}: {issuedDate}</span>
        </div>
      </div>

      {/* ── Intro text ── */}
      <p style={{ fontSize: '12px', lineHeight: '1.8', color: '#444', marginBottom: '20px', textAlign: 'justify' }}>
        {s.intro}
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
          <SectionHeader>{s.sec_site}</SectionHeader>
          <Row label={s.label_site_name} value={contract.siteName} />
          {contract.siteAddress && <Row label={s.label_site_addr} value={contract.siteAddress} />}

          {/* 근무 조건 */}
          <SectionHeader>{s.sec_work}</SectionHeader>
          <Row label={s.label_job} value={contract.jobTitle} />
          <Row label={s.label_work_date} value={formatDate(contract.workDate, locale)} />
          {(contract.startTime || contract.endTime) && (
            <Row
              label={s.label_work_time}
              value={`${contract.startTime ?? '00:00'} ~ ${contract.endTime ?? '00:00'}`}
            />
          )}
          <Row
            label={s.label_wage}
            value={
              <span style={{ fontWeight: 700, color: '#0669F7', fontSize: '13px' }}>
                {fmtVND(contract.dailyWage)}
              </span>
            }
          />
          <Row label={s.label_pay_method} value={s.pay_method_val} />

          {/* 근로자 정보 */}
          <SectionHeader>{s.sec_worker}</SectionHeader>
          <Row label={s.label_name} value={contract.workerName ?? '-'} />
          {contract.workerPhone && <Row label={s.label_phone} value={contract.workerPhone} />}

          {/* 건설사 정보 */}
          <SectionHeader>{s.sec_company}</SectionHeader>
          {contract.companyName ? (
            <>
              <Row label={s.label_company} value={contract.companyName} />
              {contract.companyContactName && <Row label={s.label_contact} value={contract.companyContactName} />}
              {contract.companyContactPhone && <Row label={s.label_phone} value={contract.companyContactPhone} />}
            </>
          ) : (
            <>
              <Row label={s.label_name} value={contract.managerName ?? '-'} />
              {contract.managerPhone && <Row label={s.label_phone} value={contract.managerPhone} />}
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
          {s.terms_title}
        </p>
        <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', lineHeight: '2', color: '#555' }}>
          {s.terms.map((term, i) => <li key={i}>{term}</li>)}
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
          {s.sig_title}
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
                {s.party_a}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                {s.name_prefix}: {contract.workerName ?? '_________________'}
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
                    alt={s.party_a}
                    style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
                    crossOrigin="anonymous"
                  />
                ) : contract.workerSignedAt ? (
                  <div style={{ textAlign: 'center' }}>
                    <svg style={{ width: '22px', height: '22px', color: '#1a4fa0', margin: '0 auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span style={{ fontSize: '10px', color: '#1a4fa0', fontWeight: 700 }}>{s.sig_done}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: '#BBB', fontStyle: 'italic' }}>
                    {s.sig_pending}
                  </span>
                )}
              </div>

              {contract.workerSignedAt && (
                <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                  {s.sig_date}: {formatDateShort(contract.workerSignedAt, locale)}
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
                {s.party_b}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                {contract.companyName
                  ? `${s.company_prefix}: ${contract.companyName}`
                  : `${s.manager_prefix}: ${contract.managerName ?? '_________________'}`
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
                    alt={s.party_b}
                    style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
                    crossOrigin="anonymous"
                  />
                ) : null}
              </div>

              {contract.managerSignedAt && (previewManagerSigUrl ?? contract.companySigUrl ?? contract.managerSigUrl) && (
                <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                  {s.stamp_date}: {formatDateShort(contract.managerSignedAt, locale)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#AAA', borderTop: '1px solid #EEE', paddingTop: '12px' }}>
        {s.footer} · {s.contract_no_label}: {contractNo}
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
  lang?: string
}

export function ContractDownloadButton({ documentRef, contractId, disabled, lang }: DownloadButtonProps) {
  const locale = useLocale()
  const s = CONTRACT_STRINGS[getLang(lang ?? locale)]
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
      a.download = `${s.filename_prefix}_${contractId.slice(0, 8).toUpperCase()}.png`
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
          {s.btn_saving}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {s.btn_save}
        </>
      )}
    </button>
  )
}
