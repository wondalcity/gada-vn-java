'use client'

import * as React from 'react'

interface AlertState {
  open: boolean
  title: string
  message: string
}

interface AlertContextValue {
  showAlert: (message: string, title?: string) => void
}

const AlertContext = React.createContext<AlertContextValue>({ showAlert: () => {} })

export function useAlert() {
  return React.useContext(AlertContext)
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AlertState>({ open: false, title: '', message: '' })

  const showAlert = React.useCallback((message: string, title = '오류') => {
    setState({ open: true, title, message })
  }, [])

  const close = () => setState(s => ({ ...s, open: false }))

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#25282A] mb-2">{state.title}</h3>
            <p className="text-sm text-[#4B5563] leading-relaxed mb-5">{state.message}</p>
            <button
              type="button"
              onClick={close}
              className="w-full py-3 rounded-full bg-[#0669F7] text-white text-sm font-bold hover:bg-[#0557D4] transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  )
}
