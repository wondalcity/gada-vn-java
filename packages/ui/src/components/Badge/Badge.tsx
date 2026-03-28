import * as React from 'react'
import { cn } from '../../utils/cn'

export type BadgeStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'cancelled'
  | 'closed'
  | 'draft'
  | 'expired'
  | 'withdrawn'
  | 'open'

export type BadgeVariant = 'filled' | 'subtle'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  status?: BadgeStatus
  label: string
  variant?: BadgeVariant
  size?: BadgeSize
  pill?: boolean
  className?: string
}

const statusStyles: Record<BadgeStatus, { filled: string; subtle: string }> = {
  pending:   { filled: 'bg-[#FDBC08] text-[#3C2C02]',  subtle: 'bg-[#FCECBB] text-[#3C2C02]' },
  approved:  { filled: 'bg-[#00C800] text-white',        subtle: 'bg-[#D1F3D3] text-[#024209]' },
  active:    { filled: 'bg-[#00C800] text-white',        subtle: 'bg-[#D1F3D3] text-[#024209]' },
  open:      { filled: 'bg-[#0669F7] text-white',        subtle: 'bg-[#C1DAFF] text-[#072857]' },
  rejected:  { filled: 'bg-[#ED1C24] text-white',        subtle: 'bg-[#FFDCE0] text-[#540C0E]' },
  cancelled: { filled: 'bg-[#ED1C24] text-white',        subtle: 'bg-[#FFDCE0] text-[#540C0E]' },
  closed:    { filled: 'bg-[#B2B2B2] text-[#25282A]',   subtle: 'bg-[#F2F2F2] text-[#7A7B7A]' },
  draft:     { filled: 'bg-[#C4C4C4] text-[#474747]',   subtle: 'bg-[#F8F8FA] text-[#7A7B7A]' },
  expired:   { filled: 'bg-[#B2B2B2] text-[#25282A]',   subtle: 'bg-[#F2F2F2] text-[#7A7B7A]' },
  withdrawn: { filled: 'bg-[#DDDDDD] text-[#595959]',   subtle: 'bg-[#F8F8FA] text-[#7A7B7A]' },
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[11px] leading-[16px] px-2 py-0.5',
  md: 'text-[13px] leading-[18px] px-3 py-1',
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  variant = 'subtle',
  size = 'md',
  pill = false,
  className,
}) => {
  const colorStyle = status ? statusStyles[status][variant] : ''

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium whitespace-nowrap',
        pill ? 'rounded-full' : 'rounded-sm',
        sizeStyles[size],
        colorStyle,
        className,
      )}
    >
      {label}
    </span>
  )
}
