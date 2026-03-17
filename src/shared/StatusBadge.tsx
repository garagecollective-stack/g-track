import type { TaskStatus, ProjectStatus } from '../types'

interface Props {
  status: TaskStatus | ProjectStatus
}

const styles: Record<string, string> = {
  backlog:    'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-[#9CA3AF]',
  inProgress: 'bg-blue-100 text-blue-700 dark:bg-[#1E3A8A]/60 dark:text-[#93C5FD]',
  done:       'bg-green-100 text-green-700 dark:bg-[#22C55E]/15 dark:text-[#22C55E]',
  onHold:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  completed:  'bg-[#edf8f4] text-[#0A5540] dark:bg-[#22C55E]/15 dark:text-[#22C55E]',
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-[#9CA3AF]'}`}>
      {labels[status] || status}
    </span>
  )
}
