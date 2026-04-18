import type { TaskStatus, ProjectStatus } from '../types'

interface Props {
  status: TaskStatus | ProjectStatus
}

const styles: Record<string, string> = {
  backlog:    'bg-[var(--surface-2)] text-[var(--ink-500)] ring-1 ring-inset ring-[var(--line-2)]',
  inProgress: 'bg-[var(--primary-50)] text-[var(--primary-700)] ring-1 ring-inset ring-[var(--primary-200)]',
  done:       'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
  onHold:     'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
  completed:  'bg-[var(--primary-50)] text-[var(--primary-700)] ring-1 ring-inset ring-[var(--primary-200)]',
}

const dotColor: Record<string, string> = {
  backlog:    'bg-[var(--ink-400)]',
  inProgress: 'bg-[var(--primary)] animate-soft-pulse',
  done:       'bg-emerald-500',
  onHold:     'bg-amber-500',
  completed:  'bg-[var(--primary)]',
}

const labels: Record<string, string> = {
  backlog:    'Backlog',
  inProgress: 'In Progress',
  done:       'Done',
  onHold:     'On Hold',
  completed:  'Completed',
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-[-0.005em] ${styles[status] || styles.backlog}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[status] || dotColor.backlog}`} />
      {labels[status] || status}
    </span>
  )
}
