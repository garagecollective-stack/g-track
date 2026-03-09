import type { TaskStatus, ProjectStatus } from '../types'

interface Props {
  status: TaskStatus | ProjectStatus
}

const styles: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-600',
  inProgress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  onHold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-[#edf8f4] text-[#0A5540]',
}

const labels: Record<string, string> = {
  backlog: 'Backlog',
  inProgress: 'In Progress',
  done: 'Done',
  onHold: 'On Hold',
  completed: 'Completed',
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  )
}
