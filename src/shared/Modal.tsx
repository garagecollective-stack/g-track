import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  '3xl': 'max-w-6xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`
        bg-[var(--surface-1)] border border-[var(--line-1)] w-full ${sizeMap[size]}
        rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)] shadow-[var(--shadow-xl)]
        max-h-[90vh] overflow-y-auto
        animate-fade-scale-in
      `}>
        <div className="w-10 h-1 bg-[var(--line-2)] rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-1)] sticky top-0 bg-[var(--surface-1)]/95 backdrop-blur-md z-10">
            <h2 className="font-display text-[17px] font-semibold text-[var(--ink-900)] tracking-[-0.01em]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[var(--ink-400)] hover:text-[var(--ink-900)] p-2 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
