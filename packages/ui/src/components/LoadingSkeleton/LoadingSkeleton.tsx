import * as React from 'react'
import { cn } from '../../utils/cn'

export type SkeletonVariant = 'text' | 'circular' | 'rectangular'

export interface SkeletonProps {
  variant?: SkeletonVariant
  width?: number | string
  height?: number | string
  className?: string
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className,
}) => {
  return (
    <div
      className={cn(
        'animate-shimmer',
        'bg-[linear-gradient(90deg,#F2F2F2_25%,#DDDDDD_50%,#F2F2F2_75%)]',
        'bg-[length:200%_100%]',
        variant === 'circular' ? 'rounded-full' : 'rounded-sm',
        variant === 'text' && 'h-4 rounded-sm',
        className,
      )}
      style={{
        width: width ?? (variant === 'text' ? '100%' : undefined),
        height: height ?? (variant === 'text' ? 16 : undefined),
      }}
      aria-hidden="true"
    />
  )
}

/** Pre-built skeleton for a JobCard */
export const SkeletonJobCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'bg-surface rounded-sm border border-outline p-4',
      'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
      className,
    )}
    aria-busy="true"
    aria-label="Loading job"
  >
    {/* Top row: badge + distance */}
    <div className="flex items-center justify-between mb-2">
      <Skeleton width={64} height={20} className="rounded-full" />
      <Skeleton width={48} height={14} />
    </div>
    {/* Title */}
    <Skeleton height={20} className="mb-1" />
    <Skeleton width="60%" height={20} className="mb-3" />
    {/* Site */}
    <Skeleton height={18} width="50%" className="mb-3" />
    {/* Meta */}
    <div className="flex gap-3 mb-4">
      <Skeleton width={80} height={18} />
      <Skeleton width={60} height={18} />
      <Skeleton width={100} height={18} />
    </div>
    {/* Wage + button */}
    <div className="flex items-end justify-between">
      <div>
        <Skeleton width={40} height={14} className="mb-1" />
        <Skeleton width={120} height={24} />
      </div>
      <Skeleton width={88} height={44} className="rounded-full" />
    </div>
  </div>
)

/** Pre-built skeleton for a generic list item row */
export const SkeletonListItem: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn('flex items-center gap-3 py-3 px-4', className)}
    aria-busy="true"
  >
    <Skeleton variant="circular" width={40} height={40} className="flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <Skeleton height={16} width="70%" className="mb-1.5" />
      <Skeleton height={14} width="45%" />
    </div>
    <Skeleton width={60} height={20} />
  </div>
)

/** Pre-built skeleton for a text block */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={cn('flex flex-col gap-2', className)} aria-busy="true">
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '65%' : '100%'}
      />
    ))}
  </div>
)
