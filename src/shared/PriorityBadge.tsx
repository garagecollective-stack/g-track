import type { Priority } from '../types'

interface Props {
  priority: Priority
}

const styles: Record<Priority, string> = {
  critical: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
  high:     'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60',
  medium:   'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
  low:      'bg-[var(--surface-2)] text-[var(--ink-500)] ring-[var(--line-2)]',
}

const dots: Record<Priority, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-amber-500',
  low:      'bg-[var(--ink-400)]',
}

const labels: Record<Priority, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
}

export function PriorityBadge({ priority }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-[-0.005em] ring-1 ring-inset ${styles[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[priority]}`} />
      {labels[priority]}
    </span>
  )
}
