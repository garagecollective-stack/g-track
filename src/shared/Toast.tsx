import { useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ToastItem } from '../types'

const icons = {
  success: <CheckCircle size={18} className="text-[#0A5540] shrink-0" />,
  error: <XCircle size={18} className="text-red-500 shrink-0" />,
  warning: <AlertTriangle size={18} className="text-orange-500 shrink-0" />,
  info: <Info size={18} className="text-blue-500 shrink-0" />,
}

const borderColors = {
  success: 'border-l-[#0A5540]',
  error: 'border-l-red-500',
  warning: 'border-l-orange-500',
  info: 'border-l-blue-500',
}

function ToastItem({ toast }: { toast: ToastItem }) {
  const { removeToast } = useApp()
  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${borderColors[toast.type]} rounded-lg shadow-lg p-4 flex gap-3 min-w-[300px] max-w-[420px] animate-slide-in-right`}>
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
        {toast.message && <p className="text-xs text-gray-500 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-gray-400 hover:text-gray-600 shrink-0"
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
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}

// Auto-dismiss wrapper: not needed since AppContext already handles it
export function useToastInit() {
  const { toasts, removeToast } = useApp()
  useEffect(() => {
    // handled in context
  }, [toasts, removeToast])
}
