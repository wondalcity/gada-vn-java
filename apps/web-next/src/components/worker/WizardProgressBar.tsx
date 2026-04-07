'use client'

import * as React from 'react'

interface Step {
  label: string
}

interface WizardProgressBarProps {
  steps: Step[]
  currentStep: number
  completedSteps: Set<number>
}

export default function WizardProgressBar({ steps, currentStep, completedSteps }: WizardProgressBarProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center min-w-max px-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index)
          const isCurrent = index === currentStep
          const isFuture = !isCompleted && !isCurrent

          return (
            <React.Fragment key={index}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-200
                    ${isCompleted
                      ? 'bg-[#0669F7] text-white shadow-sm'
                      : isCurrent
                        ? 'bg-[#0669F7] text-white shadow-md ring-2 ring-[#0669F7] ring-offset-2'
                        : 'bg-white border-2 border-[#EFF1F5] text-[#98A2B2]'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`
                    mt-1 text-xs font-medium whitespace-nowrap
                    ${isCurrent ? 'text-[#0669F7]' : isCompleted ? 'text-[#25282A]' : 'text-[#98A2B2]'}
                    ${isFuture ? 'hidden sm:block' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (not after last step) */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    h-0.5 w-8 mx-1 mb-5 flex-shrink-0 transition-colors duration-200
                    ${completedSteps.has(index) ? 'bg-[#0669F7]' : 'bg-[#EFF1F5]'}
                  `}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
