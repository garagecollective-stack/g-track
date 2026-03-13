import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-react'

interface Props {
  // Backward-compat: supports both open/isOpen and description/message
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  description?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'confirm'
  typeToConfirm?: string
  isLoading?: boolean
}

export function ConfirmDialog({
  open, isOpen,
  onClose, onConfirm,
  title, description, message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  typeToConfirm,
  isLoading = false,
}: Props) {
  const isVisible = open ?? isOpen ?? false
  const displayText = description ?? message ?? ''

  const [typed, setTyped] = useState('')
  const [internalLoading, setInternalLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const loading = isLoading || internalLoading
  const canConfirm = typeToConfirm ? typed === typeToConfirm : true

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Mount/unmount with enter/exit animation
  useEffect(() => {
    if (isVisible) {
      setMounted(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)))
      return () => cancelAnimationFrame(id)
    } else {
      setShow(false)
      const timer = setTimeout(() => { setMounted(false); setTyped('') }, 160)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  // Auto-focus confirm button
  useEffect(() => {
    if (show) confirmBtnRef.current?.focus()
  }, [show])

  // Escape key — capture phase to prevent parent modals from also closing
  useEffect(() => {
    if (!isVisible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [isVisible, loading, onClose])

  // Focus trap
  useEffect(() => {
    if (!show || !dialogRef.current) return
    const dialog = dialogRef.current
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus() } }
      else { if (document.activeElement === last) { e.preventDefault(); first?.focus() } }
    }
    dialog.addEventListener('keydown', trap)
    return () => dialog.removeEventListener('keydown', trap)
  }, [show])

  if (!mounted) return null

  const handleConfirm = async () => {
    setInternalLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // errors handled by caller
    } finally {
      setInternalLoading(false)
      setTyped('')
    }
  }

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  // Variant config
  const icon = variant === 'danger'
    ? <Trash2 size={20} className="text-red-500" />
    : variant === 'confirm'
    ? <CheckCircle size={20} className="text-[#0A5540]" />
    : <AlertTriangle size={20} className="text-amber-500" />

  const iconBg = variant === 'danger' ? 'bg-red-50' : variant === 'confirm' ? 'bg-[#edf8f4]' : 'bg-amber-50'
  const btnCls = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600'
    : variant === 'confirm'
    ? 'bg-[#0A5540] hover:bg-[#0d6b51]'
    : 'bg-amber-500 hover:bg-amber-600'

  const spinnerEl = (
    <span className="flex items-center justify-center">
      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
    </span>
  )

  const bodyContent = (
    <>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${iconBg}`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{displayText}</p>

      {typeToConfirm && (
        <div className="mt-4 text-left">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
            Type <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">"{typeToConfirm}"</span> to confirm
          </label>
          <input
            type="text" value={typed} onChange={e => setTyped(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10"
            placeholder={typeToConfirm}
          />
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleClose}
          disabled={loading}
          className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          ref={confirmBtnRef}
          onClick={handleConfirm}
          disabled={!canConfirm || loading}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-80 ${btnCls}`}
        >
          {loading ? spinnerEl : confirmLabel}
        </button>
      </div>
    </>
  )

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end">
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          ref={dialogRef}
          className={`relative w-full bg-white dark:bg-gray-900 rounded-t-2xl p-6 shadow-xl transition-transform duration-200 ease-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
          <div className="text-center">{bodyContent}</div>
        </div>
      </div>
    )
  }

  // Desktop: centered modal
  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={handleBackdropClick} />
      <div
        ref={dialogRef}
        className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center transition-all duration-200 ease-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        {bodyContent}
      </div>
    </div>
  )

  function handleBackdropClick() {
    handleClose()
  }
}
