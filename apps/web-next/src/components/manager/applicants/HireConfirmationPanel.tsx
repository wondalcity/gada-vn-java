'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import ConfirmModal from '@/components/manager/ConfirmModal'

interface Props {
  acceptedCount: number
  slotsTotal: number
  slotsFilled: number
  jobId: string
  onConfirm: () => Promise<void>
  isConfirming: boolean
  jobStatus: string
}

export default function HireConfirmationPanel({
  acceptedCount,
  slotsTotal,
  slotsFilled,
  onConfirm,
  isConfirming,
  jobStatus,
}: Props) {
  const t = useTranslations('manager')
  const [showConfirm, setShowConfirm] = React.useState(false)
  const progress = slotsTotal > 0 ? Math.min((slotsFilled / slotsTotal) * 100, 100) : 0

  if (acceptedCount === 0 && jobStatus !== 'FILLED') return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EFF1F5] px-4 py-3 shadow-lg z-30">
        <div className="max-w-[1760px] mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#25282A]">
              {t('hire_panel.accepted_status', { count: acceptedCount, total: slotsTotal })}
            </p>
            {/* Mini progress bar */}
            <div className="w-full bg-[#DDDDDD] rounded-full h-1.5 mt-1.5">
              <div
                className="bg-[#0669F7] h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            {jobStatus !== 'FILLED' ? (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={isConfirming || acceptedCount === 0}
                className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-[#0557D4] disabled:opacity-40"
              >
                {t('hire_panel.finalize')}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-[#0557D4] disabled:opacity-40"
              >
                {t('hire_panel.filled')}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={t('hire_panel.confirm_title')}
        message={t('hire_panel.confirm_message', { count: acceptedCount })}
        confirmLabel={t('hire_panel.confirm_label')}
        confirmVariant="primary"
        onConfirm={async () => {
          await onConfirm()
          setShowConfirm(false)
        }}
        onCancel={() => setShowConfirm(false)}
        isLoading={isConfirming}
      />
    </>
  )
}
