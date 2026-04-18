import { getDeptColor } from '../utils/helpers'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-[-0.005em] ${className}`}>
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
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]">
      <span
        className="w-2 h-2 rounded-full shrink-0 ring-2 ring-[var(--surface-1)]"
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
    super_admin: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
    director:    'bg-[var(--primary-50)] text-[var(--primary-700)] ring-[var(--primary-200)]',
    teamLead:    'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60',
    member:      'bg-[var(--surface-2)] text-[var(--ink-700)] ring-[var(--line-2)]',
  }
  const labels = { super_admin: 'Super Admin', director: 'Director', teamLead: 'Team Lead', member: 'Member' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-[-0.005em] ring-1 ring-inset ${styles[role]}`}>
      {labels[role]}
    </span>
  )
}
