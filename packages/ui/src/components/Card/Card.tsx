import * as React from 'react'
import { cn } from '../../utils/cn'

export type CardPadding = 'sm' | 'md' | 'lg' | 'none'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  header?: React.ReactNode
  footer?: React.ReactNode
  bordered?: boolean
  hoverable?: boolean
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  header,
  footer,
  bordered = true,
  hoverable = false,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-surface rounded-sm',
        bordered && 'border border-outline',
        'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        hoverable && 'cursor-pointer transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] active:shadow-none',
        className,
      )}
      {...props}
    >
      {header && (
        <>
          <div className={cn(paddingStyles[padding], padding === 'none' ? '' : 'pb-0')}>
            {header}
          </div>
          <hr className="border-outline my-0" />
        </>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer && (
        <>
          <hr className="border-outline my-0" />
          <div className={cn(paddingStyles[padding], padding === 'none' ? '' : 'pt-0')}>
            {footer}
          </div>
        </>
      )}
    </div>
  )
}
