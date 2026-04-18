import { useState, useEffect, useRef } from 'react'
import { Shield, Users, User, ChevronDown, Check } from 'lucide-react'
import type { Role } from '../types'

interface RoleOption {
  value: Role
  label: string
  subLabel: string
  icon: React.ElementType
  iconColor: string
  badgeBg: string
  badgeText: string
  badgeLabel: string
  selectedBg: string
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'director',
    label: 'Director',
    subLabel: 'Full access to all departments',
    icon: Shield,
    iconColor: 'text-[var(--primary)]',
    badgeBg: 'bg-[var(--primary-50)]',
    badgeText: 'text-[var(--primary)]',
    badgeLabel: 'Director',
    selectedBg: 'bg-[var(--primary-50)]',
  },
  {
    value: 'teamLead',
    label: 'Team Lead',
    subLabel: 'Manages department projects and tasks',
    icon: Users,
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    badgeLabel: 'Team Lead',
    selectedBg: 'bg-purple-50',
  },
  {
    value: 'member',
    label: 'Member',
    subLabel: 'Can view and update assigned tasks',
    icon: User,
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    badgeLabel: 'Member',
    selectedBg: 'bg-blue-50',
  },
]

interface Props {
  value: string
  onChange: (value: Role) => void
  disabled?: boolean
  // Informational props for parent confirmation logic — not used by this component
  showConfirm?: boolean
  currentUserName?: string
  originalValue?: string
}

export function RoleDropdown({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [isMobile, setIsMobile] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const selected = ROLE_OPTIONS.find(o => o.value === value) ?? ROLE_OPTIONS[2]

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const openDropdown = () => {
    const idx = ROLE_OPTIONS.findIndex(o => o.value === value)
    setFocusedIdx(idx >= 0 ? idx : 0)
    setOpen(true)
  }

  const closeDropdown = () => {
    setFocusedIdx(-1)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); openDropdown()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, ROLE_OPTIONS.length - 1)); break
      case 'ArrowUp': e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)); break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIdx >= 0) { onChange(ROLE_OPTIONS[focusedIdx].value); closeDropdown() }
        break
      case 'Escape': e.preventDefault(); closeDropdown(); break
    }
  }

  const selectOption = (optValue: Role) => {
    onChange(optValue)
    closeDropdown()
    btnRef.current?.focus()
  }

  const optionList = (
    <div className="py-1">
      {ROLE_OPTIONS.map((opt, idx) => {
        const Icon = opt.icon
        const isSelected = value === opt.value
        const isFocused = focusedIdx === idx
        return (
          <div key={opt.value}>
            {idx > 0 && <div className="border-t border-[var(--line-1)] dark:border-[var(--line-1)] mx-3" />}
            <button
              type="button"
              onClick={() => selectOption(opt.value)}
              onMouseEnter={() => setFocusedIdx(idx)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors duration-100 ${
                isSelected ? opt.selectedBg : isFocused ? 'bg-[var(--surface-2)] dark:bg-[var(--surface-1)]' : ''
              }`}
            >
              <Icon size={16} className={opt.iconColor} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--ink-900)] dark:text-[var(--ink-900)]">{opt.label}</p>
                <p className="text-xs text-[var(--ink-400)] mt-0.5">{opt.subLabel}</p>
              </div>
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 shrink-0 ${opt.badgeBg} ${opt.badgeText}`}>
                {opt.badgeLabel}
              </span>
              {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
            </button>
          </div>
        )
      })}
    </div>
  )

  const SelectedIcon = selected.icon

  const trigger = (
    <button
      ref={btnRef}
      type="button"
      onClick={() => {
        if (disabled) return
        if (open) closeDropdown()
        else openDropdown()
      }}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className="w-full h-[42px] flex items-center bg-[var(--surface-1)] dark:bg-[var(--surface-0)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-sm)] px-3 gap-2 transition-all duration-150 hover:border-[var(--line-2)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <SelectedIcon size={16} className={selected.iconColor} />
      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${selected.badgeBg} ${selected.badgeText}`}>
        {selected.badgeLabel}
      </span>
      <ChevronDown size={16} className={`text-[var(--ink-400)] ml-auto transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
    </button>
  )

  if (isMobile) {
    return (
      <div ref={ref}>
        {trigger}
        {open && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={closeDropdown}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative w-full bg-[var(--surface-1)] dark:bg-[var(--surface-0)] rounded-t-2xl shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 dark:bg-[var(--surface-2)] rounded-full mx-auto mt-3 mb-1" />
              <p className="text-xs font-semibold text-[var(--ink-400)] uppercase tracking-wide px-4 py-2">Select Role</p>
              {optionList}
              <div className="pb-safe pb-4" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--surface-1)] dark:bg-[var(--surface-0)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-lg)] shadow-lg overflow-hidden">
          {optionList}
        </div>
      )}
    </div>
  )
}
