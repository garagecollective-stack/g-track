import { type LucideIcon } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-[var(--primary)]/5 blur-2xl" />
          <div className="relative w-14 h-14 rounded-[var(--r-lg)] bg-[var(--surface-2)] border border-[var(--line-1)] flex items-center justify-center">
            <Icon size={22} className="text-[var(--ink-400)]" strokeWidth={1.6} />
          </div>
        </div>
      )}
      <p className="text-[14px] font-semibold text-[var(--ink-900)] tracking-[-0.01em]">{title}</p>
      {subtitle && <p className="text-[13px] text-[var(--ink-500)] mt-1.5 max-w-xs leading-relaxed">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary mt-5"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
