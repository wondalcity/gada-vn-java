'use client'

import * as React from 'react'
import { ProfileDraft } from '@/types/worker-profile'

// Comprehensive list of Vietnamese banks
const VN_BANKS = [
  { code: 'VCB',     name: 'Vietcombank',       fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { code: 'CTG',     name: 'VietinBank',         fullName: 'Ngân hàng TMCP Công thương Việt Nam' },
  { code: 'BIDV',    name: 'BIDV',               fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: 'AGR',     name: 'Agribank',           fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn' },
  { code: 'MBB',     name: 'MB Bank',            fullName: 'Ngân hàng TMCP Quân đội' },
  { code: 'TCB',     name: 'Techcombank',        fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { code: 'ACB',     name: 'ACB',                fullName: 'Ngân hàng TMCP Á Châu' },
  { code: 'VPB',     name: 'VPBank',             fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: 'HDB',     name: 'HDBank',             fullName: 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh' },
  { code: 'SHB',     name: 'SHB',                fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { code: 'TPB',     name: 'TPBank',             fullName: 'Ngân hàng TMCP Tiên Phong' },
  { code: 'STB',     name: 'Sacombank',          fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: 'VIB',     name: 'VIB',                fullName: 'Ngân hàng TMCP Quốc Tế Việt Nam' },
  { code: 'OCB',     name: 'OCB',                fullName: 'Ngân hàng TMCP Phương Đông' },
  { code: 'MSB',     name: 'MSB',                fullName: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
  { code: 'SEAB',    name: 'SeABank',            fullName: 'Ngân hàng TMCP Đông Nam Á' },
  { code: 'EIB',     name: 'Eximbank',           fullName: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
  { code: 'NCB',     name: 'NCB',                fullName: 'Ngân hàng TMCP Quốc Dân' },
  { code: 'PVC',     name: 'PVcomBank',          fullName: 'Ngân hàng TMCP Đại chúng Việt Nam' },
  { code: 'ABB',     name: 'ABBank',             fullName: 'Ngân hàng TMCP An Bình' },
  { code: 'LPB',     name: 'LienVietPostBank',   fullName: 'Ngân hàng TMCP Bưu điện Liên Việt' },
  { code: 'BVB',     name: 'BaoViet Bank',       fullName: 'Ngân hàng TMCP Bảo Việt' },
  { code: 'KLB',     name: 'KienlongBank',       fullName: 'Ngân hàng TMCP Kiên Long' },
  { code: 'NAB',     name: 'NamABank',           fullName: 'Ngân hàng TMCP Nam Á' },
  { code: 'VBB',     name: 'VietBank',           fullName: 'Ngân hàng TMCP Việt Nam Thương Tín' },
  { code: 'SGB',     name: 'Saigonbank',         fullName: 'Ngân hàng TMCP Sài Gòn Công Thương' },
  { code: 'BANVIET', name: 'BVBank',             fullName: 'Ngân hàng TMCP Bản Việt' },
  { code: 'GPB',     name: 'GPBank',             fullName: 'Ngân hàng TM TNHH MTV Dầu khí toàn cầu' },
  { code: 'OJB',     name: 'OceanBank',          fullName: 'Ngân hàng TM TNHH MTV Đại Dương' },
  { code: 'COOP',    name: 'Co-opBank',          fullName: 'Ngân hàng Hợp tác xã Việt Nam' },
  { code: 'WOO',     name: 'Woori Bank',         fullName: 'Ngân hàng Woori Việt Nam' },
  { code: 'SHINHAN', name: 'Shinhan Bank',       fullName: 'Ngân hàng Shinhan Việt Nam' },
  { code: 'KBHN',    name: 'KB Kookmin Bank',    fullName: 'Ngân hàng KB Kookmin Việt Nam' },
  { code: 'HSBC',    name: 'HSBC',               fullName: 'Ngân hàng HSBC Việt Nam' },
  { code: 'SCBVN',   name: 'Standard Chartered', fullName: 'Ngân hàng Standard Chartered Việt Nam' },
] as const

interface BankSelectProps {
  value: string
  onChange: (v: string) => void
}

function BankSelect({ value, onChange }: BankSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [fixedTop, setFixedTop] = React.useState(0)
  const [fixedLeft, setFixedLeft] = React.useState(0)
  const [dropdownWidth, setDropdownWidth] = React.useState(280)

  const filtered = search.trim()
    ? VN_BANKS.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.fullName.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase())
      )
    : VN_BANKS

  // Close on outside click / scroll / resize — same pattern as DatePicker/TimePicker
  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const portal = document.getElementById('bankselect-portal')
      if (containerRef.current?.contains(e.target as Node)) return
      if (portal?.contains(e.target as Node)) return
      setOpen(false)
    }
    function handleClose() { setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [open])

  // Focus search on open
  React.useEffect(() => {
    if (open) {
      setSearch('')
      const t = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  function openDropdown() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const dropH = 340
      const w = Math.max(rect.width, 280)
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const top = spaceBelow >= dropH ? rect.bottom + 4 : Math.max(8, rect.top - dropH - 4)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
      setFixedTop(top)
      setFixedLeft(left)
      setDropdownWidth(w)
    }
    setOpen(true)
  }

  function select(name: string) {
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={openDropdown}
        className={[
          'w-full px-3 py-3 rounded-2xl border text-sm text-left flex items-center justify-between min-h-[44px] bg-white transition-colors',
          open
            ? 'border-[#0669F7] ring-2 ring-[#0669F7]/10'
            : 'border-[#EFF1F5] hover:border-[#0669F7]',
          value ? 'text-[#25282A]' : 'text-[#98A2B2]',
        ].join(' ')}
      >
        <span>{value || '은행을 선택해주세요'}</span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180 text-[#0669F7]' : 'text-[#98A2B2]'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown — inline fixed, same pattern as DatePicker/TimePicker */}
      {open && (
        <div
          id="bankselect-portal"
          className="bg-white rounded-2xl shadow-2xl border border-[#EFF1F5] overflow-hidden"
          style={{ position: 'fixed', top: fixedTop, left: fixedLeft, zIndex: 9999, width: dropdownWidth }}
        >
          {/* Search */}
          <div className="p-2 border-b border-[#EFF1F5]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B2] pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1111 5a6 6 0 016 6z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="은행 검색..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EFF1F5] text-sm text-[#25282A] placeholder-[#98A2B2] focus:outline-none focus:border-[#0669F7]"
              />
            </div>
          </div>

          {/* Bank list */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-[#98A2B2] py-6">검색 결과가 없습니다</p>
            ) : (
              filtered.map((bank) => {
                const isSelected = value === bank.name
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => select(bank.name)}
                    className={[
                      'w-full text-left px-4 py-3 flex items-center justify-between gap-2 transition-colors border-b border-[#EFF1F5] last:border-0',
                      isSelected
                        ? 'bg-[#EEF4FF] text-[#0669F7]'
                        : 'text-[#25282A] hover:bg-[#F2F4F5]',
                    ].join(' ')}
                  >
                    <span>
                      <span className={`block text-sm font-semibold ${isSelected ? 'text-[#0669F7]' : 'text-[#25282A]'}`}>
                        {bank.name}
                      </span>
                      <span className={`block text-xs mt-0.5 ${isSelected ? 'text-[#0669F7]/70' : 'text-[#98A2B2]'}`}>
                        {bank.fullName}
                      </span>
                    </span>
                    {isSelected && (
                      <svg className="w-4 h-4 shrink-0 text-[#0669F7]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── BankAccountStep ───────────────────────────────────────────────────────────

interface BankAccountStepProps {
  draft: ProfileDraft
  onChange: (partial: Partial<ProfileDraft>) => void
  onNext: () => Promise<void>
  isSaving: boolean
}

export default function BankAccountStep({ draft, onChange, onNext, isSaving }: BankAccountStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">계좌 정보</h2>
        <p className="text-sm text-[#98A2B2] mt-1">급여 지급 시 사용됩니다.</p>
      </div>

      {/* Bank name — searchable dropdown */}
      <div>
        <label className="block text-sm font-medium text-[#25282A] mb-1">
          은행명
        </label>
        <BankSelect
          value={draft.bankName}
          onChange={(v) => onChange({ bankName: v })}
        />
      </div>

      {/* Account number */}
      <div>
        <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-[#25282A] mb-1">
          계좌번호
        </label>
        <input
          id="bankAccountNumber"
          type="text"
          value={draft.bankAccountNumber}
          onChange={(e) => onChange({ bankAccountNumber: e.target.value })}
          placeholder="계좌번호를 입력하세요"
          className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] min-h-[44px]"
        />
      </div>

      {/* Helper text */}
      <p className="text-xs text-[#98A2B2] bg-[#F2F4F5] rounded-2xl p-3 border border-[#EFF1F5]">
        계좌 정보는 급여 지급 및 정산 시에만 사용됩니다. 언제든지 수정할 수 있습니다.
      </p>

      {/* Nav buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onNext}
          className="text-sm text-[#98A2B2] hover:text-[#0669F7] underline-offset-2 hover:underline transition-colors"
        >
          건너뛰기
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isSaving}
          className="px-8 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
        >
          {isSaving ? '저장 중...' : '다음'}
        </button>
      </div>
    </div>
  )
}
