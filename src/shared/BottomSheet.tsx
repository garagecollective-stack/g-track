import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-end animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--surface-1)] border-t border-[var(--line-1)] w-full rounded-t-[var(--r-xl)] shadow-[var(--shadow-xl)] max-h-[90vh] overflow-y-auto animate-slide-up" role="dialog" aria-modal="true">
        <div className="w-10 h-1 bg-[var(--line-2)] rounded-full mx-auto mt-3 mb-4" />
        {title && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--line-1)]">
            <h2 className="font-display text-[16px] font-semibold text-[var(--ink-900)] tracking-[-0.01em]">{title}</h2>
            <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-900)] p-2 rounded-[var(--r-sm)] min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors">
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
