import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

const DEPT_COLORS: Record<string, string> = {
  'AI': '#6366F1',
  'Business Development': '#14B8A6',
  'Creative & Design': '#EC4899',
  'E-Learning & Education': '#8B5CF6',
  'HR': '#F97316',
  'Marcom': '#EF4444',
  'SEO': '#F59E0B',
  'Social Media & Marketing': '#3B82F6',
  'Tech & Development': '#0A5540',
  // Also map existing department names
  'Developer': '#6366F1',
  'Design': '#EC4899',
  'Social Media': '#3B82F6',
}

interface DeptItem { id: string; name: string; color: string }

interface Props {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  // Informational props for parent confirmation logic — not used by this component
  showConfirm?: boolean
  currentUserName?: string
  originalValue?: string
}

export function DepartmentDropdown({ value, onChange, disabled, placeholder = 'Select department' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [departments, setDepartments] = useState<DeptItem[]>([])
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [isMobile, setIsMobile] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Fetch departments from Supabase
  useEffect(() => {
    supabase.from('departments').select('id, name, color').order('name')
      .then(({ data }) => setDepartments(data || []))
  }, [])

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
    setSearch('')
    setFocusedIdx(-1)
    setOpen(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  const closeDropdown = () => setOpen(false)

  const getDeptColor = (dept: DeptItem) =>
    dept.color || DEPT_COLORS[dept.name] || '#9CA3AF'

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  // All options including "No department" at top
  const allOptions = [{ id: '', name: 'No department', color: '#9CA3AF' }, ...filtered]

  const selectedDept = departments.find(d => d.name === value)

  const handleKeyDownBtn = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); openDropdown()
      }
      return
    }
    switch (e.key) {
      case 'Escape': e.preventDefault(); closeDropdown(); break
    }
  }

  const handleKeyDownSearch = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setFocusedIdx(0); break
      case 'Escape': e.preventDefault(); closeDropdown(); break
    }
  }

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, allOptions.length - 1)); break
      case 'ArrowUp':
        e.preventDefault()
        if (focusedIdx <= 0) searchRef.current?.focus()
        else setFocusedIdx(i => i - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIdx >= 0) { selectOption(allOptions[focusedIdx].name); }
        break
      case 'Escape': e.preventDefault(); closeDropdown(); break
    }
  }

  const selectOption = (name: string) => {
    onChange(name)
    closeDropdown()
    btnRef.current?.focus()
  }

  const optionList = (
    <div className="max-h-[240px] overflow-y-auto py-1" onKeyDown={handleKeyDownList} tabIndex={-1}>
      {/* No department */}
      <button
        type="button"
        onMouseEnter={() => setFocusedIdx(0)}
        onClick={() => selectOption('')}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
          focusedIdx === 0 || (!value && focusedIdx === -1) ? 'bg-[var(--surface-2)] dark:bg-[var(--surface-1)]' : ''
        } ${!value ? 'bg-[var(--primary-50)]' : 'hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)]'}`}
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#9CA3AF' }} />
        <span className="text-sm text-[var(--ink-500)] dark:text-[var(--ink-400)] italic flex-1">No department</span>
        {!value && <Check size={14} className="text-[var(--primary)] shrink-0" />}
      </button>

      {filtered.length > 0 && (
        <div className="border-t border-[var(--line-1)] dark:border-[var(--line-1)] mt-1 pt-1">
          {filtered.map((dept, idx) => {
            const listIdx = idx + 1 // offset by 1 for "No department" at top
            const isSelected = value === dept.name
            const isFocused = focusedIdx === listIdx
            const color = getDeptColor(dept)
            return (
              <button
                key={dept.id}
                type="button"
                onMouseEnter={() => setFocusedIdx(listIdx)}
                onClick={() => selectOption(dept.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  isSelected ? 'bg-[var(--primary-50)]' : isFocused ? 'bg-[var(--surface-2)] dark:bg-[var(--surface-1)]' : 'hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium text-[var(--ink-700)] dark:text-[var(--ink-900)] flex-1">{dept.name}</span>
                {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
              </button>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && search && (
        <p className="text-sm text-[var(--ink-400)] text-center py-6">No departments found</p>
      )}
    </div>
  )

  const trigger = (
    <button
      ref={btnRef}
      type="button"
      onClick={() => {
        if (disabled) return
        if (open) closeDropdown()
        else openDropdown()
      }}
      onKeyDown={handleKeyDownBtn}
      disabled={disabled}
      className="w-full h-[42px] flex items-center bg-[var(--surface-1)] dark:bg-[var(--surface-0)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-sm)] px-3 gap-2 transition-all duration-150 hover:border-[var(--line-2)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {selectedDept ? (
        <>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getDeptColor(selectedDept) }} />
          <span className="text-sm text-[var(--ink-700)] dark:text-[var(--ink-900)]">{selectedDept.name}</span>
        </>
      ) : (
        <>
          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-300" />
          <span className="text-sm text-[var(--ink-400)]">{placeholder}</span>
        </>
      )}
      <ChevronDown size={16} className={`text-[var(--ink-400)] ml-auto transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
    </button>
  )

  const searchBar = (
    <div className="px-3 pt-2.5 pb-2 border-b border-[var(--line-1)] dark:border-[var(--line-1)] sticky top-0 bg-[var(--surface-1)] dark:bg-[var(--surface-0)] z-10">
      <div className="flex items-center gap-2 bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-sm)] px-2.5 py-1.5">
        <Search size={13} className="text-[var(--ink-400)] shrink-0" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleKeyDownSearch}
          placeholder="Search departments..."
          className="flex-1 text-sm bg-transparent outline-none text-[var(--ink-900)] dark:text-[var(--ink-900)] placeholder-[var(--ink-400)]"
        />
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div ref={ref}>
        {trigger}
        {open && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={closeDropdown}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative w-full bg-[var(--surface-1)] dark:bg-[var(--surface-0)] rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 dark:bg-[var(--surface-2)] rounded-full mx-auto mt-3 mb-1" />
              {searchBar}
              <div className="overflow-y-auto">{optionList}</div>
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
          {searchBar}
          {optionList}
        </div>
      )}
    </div>
  )
}
