import { useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ToastItem } from '../types'

const icons = {
  success: <CheckCircle size={16} className="text-emerald-500 shrink-0" />,
  error:   <XCircle size={16} className="text-red-500 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
  info:    <Info size={16} className="text-[var(--primary)] shrink-0" />,
}

const accents = {
  success: 'border-l-emerald-500',
  error:   'border-l-red-500',
  warning: 'border-l-amber-500',
  info:    'border-l-[var(--primary)]',
}

function ToastItem({ toast }: { toast: ToastItem }) {
  const { removeToast } = useApp()
  return (
    <div className={`glass-strong border-l-4 ${accents[toast.type]} rounded-[var(--r-sm)] shadow-[var(--shadow-lg)] p-3.5 flex gap-3 w-full max-w-sm animate-slide-in-right pointer-events-auto`}>
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--ink-900)] tracking-[-0.01em]">{toast.title}</p>
        {toast.message && <p className="text-[12px] text-[var(--ink-500)] mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-[var(--ink-400)] hover:text-[var(--ink-900)] shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function Toast() {
  const { toasts } = useApp()
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}

export function useToastInit() {
  const { toasts, removeToast } = useApp()
  useEffect(() => {}, [toasts, removeToast])
}
