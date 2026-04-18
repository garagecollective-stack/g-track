import { useState, useEffect, useRef } from 'react'
import { Shield, Users, User, ChevronDown, Check } from 'lucide-react'
import type { Role } from '../types'

interface RoleOption {
  value: Role
  label: string
  subLabel: string
  icon: React.ElementType
  iconColor: string
  badge: string
  selectedBg: string
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'director',
    label: 'Director',
    subLabel: 'Full access to all departments',
    icon: Shield,
    iconColor: 'text-[var(--primary)]',
    badge: 'bg-[var(--primary-50)] text-[var(--primary)]',
    selectedBg: 'bg-[var(--primary-50)]',
  },
  {
    value: 'teamLead',
    label: 'Team Lead',
    subLabel: 'Manages department projects and tasks',
    icon: Users,
    iconColor: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    selectedBg: 'bg-purple-50',
  },
  {
    value: 'member',
    label: 'Member',
    subLabel: 'Can view and update assigned tasks',
    icon: User,
    iconColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    selectedBg: 'bg-blue-50',
  },
]

interface Props {
  value: Role
  onChange: (role: Role) => void
  disabled?: boolean
}

export function RoleSelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const selected = ROLE_OPTIONS.find(o => o.value === value) ?? ROLE_OPTIONS[2]
  const SelectedIcon = selected.icon

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(p => !p)}
        disabled={disabled}
        className="w-full h-[42px] flex items-center justify-between bg-[var(--surface-1)] dark:bg-[var(--surface-0)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-sm)] px-3 transition-all duration-150 ease-in-out hover:border-[var(--line-2)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <SelectedIcon size={16} className={selected.iconColor} />
          <span className="text-sm font-medium text-[var(--ink-900)] dark:text-[var(--ink-900)]">{selected.label}</span>
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${selected.badge}`}>{selected.label}</span>
        </div>
        <ChevronDown size={16} className={`text-[var(--ink-400)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--surface-1)] dark:bg-[var(--surface-0)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-lg)] shadow-lg overflow-hidden">
          {ROLE_OPTIONS.map((opt, idx) => {
            const Icon = opt.icon
            const isSelected = value === opt.value
            return (
              <div key={opt.value}>
                {idx > 0 && <div className="border-t border-[var(--line-1)] dark:border-[var(--line-1)]" />}
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 ease-in-out ${
                    isSelected ? opt.selectedBg : 'hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <Icon size={16} className={opt.iconColor} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink-900)] dark:text-[var(--ink-900)]">{opt.label}</p>
                    <p className="text-xs text-[var(--ink-400)]">{opt.subLabel}</p>
                  </div>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium shrink-0 ${opt.badge}`}>{opt.label}</span>
                  {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
