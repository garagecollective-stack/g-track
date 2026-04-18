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
    ? <Trash2 size={20} className="text-red-500" strokeWidth={1.8} />
    : variant === 'confirm'
    ? <CheckCircle size={20} className="text-[var(--primary)]" strokeWidth={1.8} />
    : <AlertTriangle size={20} className="text-amber-500" strokeWidth={1.8} />

  const iconBg = variant === 'danger'
    ? 'bg-red-50 dark:bg-red-950/40 ring-1 ring-inset ring-red-100 dark:ring-red-900/60'
    : variant === 'confirm'
    ? 'bg-[var(--primary-50)] ring-1 ring-inset ring-[var(--primary-200)]'
    : 'bg-amber-50 dark:bg-amber-950/40 ring-1 ring-inset ring-amber-100 dark:ring-amber-900/60'
  const btnCls = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600 shadow-[var(--shadow-sm)]'
    : variant === 'confirm'
    ? 'bg-[var(--primary)] hover:bg-[var(--primary-hi)] shadow-[var(--shadow-sm)]'
    : 'bg-amber-500 hover:bg-amber-600 shadow-[var(--shadow-sm)]'

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
      <h3 className="font-display text-[18px] font-semibold text-[var(--ink-900)] mt-4 tracking-[-0.01em]">{title}</h3>
      <p className="text-[13px] text-[var(--ink-500)] mt-2 leading-relaxed">{displayText}</p>

      {typeToConfirm && (
        <div className="mt-4 text-left">
          <label className="text-[11.5px] font-medium text-[var(--ink-700)] mb-1.5 block">
            Type <span className="font-mono font-semibold text-[var(--ink-900)]">"{typeToConfirm}"</span> to confirm
          </label>
          <input
            type="text" value={typed} onChange={e => setTyped(e.target.value)}
            className="input-surface"
            placeholder={typeToConfirm}
          />
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleClose}
          disabled={loading}
          className="btn-secondary flex-1 justify-center py-2.5 text-[13px]"
        >
          {cancelLabel}
        </button>
        <button
          ref={confirmBtnRef}
          onClick={handleConfirm}
          disabled={!canConfirm || loading}
          className={`flex-1 rounded-[var(--r-sm)] py-2.5 text-[13px] font-medium text-white transition-all disabled:opacity-60 ${btnCls}`}
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
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          className={`relative w-full bg-[var(--surface-1)] border-t border-[var(--line-1)] rounded-t-[var(--r-xl)] p-6 shadow-[var(--shadow-xl)] transition-transform duration-200 ease-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="w-10 h-1 bg-[var(--line-2)] rounded-full mx-auto mb-5" />
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={handleBackdropClick} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`relative bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-xl)] shadow-[var(--shadow-xl)] max-w-sm w-full p-6 text-center transition-all duration-200 ease-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        {bodyContent}
      </div>
    </div>
  )

  function handleBackdropClick() {
    handleClose()
  }
}
