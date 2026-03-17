import { getDeptColor } from '../utils/helpers'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

interface DeptBadgeProps {
  department: string | null
}

export function DeptBadge({ department }: DeptBadgeProps) {
  if (!department) return null
  const color = getDeptColor(department)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#9CA3AF]">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {department}
    </span>
  )
}

interface RoleBadgeProps {
  role: 'super_admin' | 'director' | 'teamLead' | 'member'
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const styles = {
    super_admin: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 font-semibold',
    director:    'bg-[#edf8f4] text-[#0A5540] dark:bg-[#22C55E]/15 dark:text-[#22C55E] font-semibold',
    teamLead:    'bg-purple-100 text-purple-700 dark:bg-[#4C1D95] dark:text-[#C4B5FD]',
    member:      'bg-blue-100 text-blue-700 dark:bg-[#1E3A8A] dark:text-[#93C5FD]',
  }
  const labels = { super_admin: 'Super Admin', director: 'Director', teamLead: 'Team Lead', member: 'Member' }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
      {labels[role]}
    </span>
  )
}
