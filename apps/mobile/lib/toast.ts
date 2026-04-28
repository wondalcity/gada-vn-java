// GADA VN — Imperative toast utility
// Usage: showToast({ message: '저장되었습니다', type: 'success' })
// ToastHost must be mounted (it's in app/_layout.tsx)

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  /** ms before auto-dismiss. Defaults to 3000 */
  duration?: number;
}

type ShowFn = (opts: ToastOptions) => void;

let _show: ShowFn | null = null;

/** Called once by <ToastHost /> on mount */
export function _registerToastHandler(fn: ShowFn) {
  _show = fn;
}

/** Show a toast notification — safe to call from any screen or handler */
export function showToast(opts: ToastOptions) {
  if (_show) {
    _show(opts);
  }
}
