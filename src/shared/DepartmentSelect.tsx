import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { DEPARTMENTS } from '../constants'

interface Props {
  value: string
  onChange: (dept: string) => void
  disabled?: boolean
  placeholder?: string
}

export function DepartmentSelect({ value, onChange, disabled, placeholder = 'Select department' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (open) {
      setSearch('')
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = DEPARTMENTS.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedDept = DEPARTMENTS.find(d => d.name === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(p => !p)}
        disabled={disabled}
        className="w-full h-[42px] flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 transition-all duration-150 ease-in-out hover:border-gray-300 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          {selectedDept ? (
            <>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedDept.color }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedDept.name}</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-300" />
              <span className="text-sm text-gray-400">{placeholder}</span>
            </>
          )}
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search departments..."
                className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {/* No department option */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 ease-in-out ${
                !value ? 'bg-gray-50 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-300" />
              <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">No department</span>
              {!value && <Check size={14} className="text-[#0A5540] shrink-0" />}
            </button>

            {filtered.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                {filtered.map(dept => {
                  const isSelected = value === dept.name
                  return (
                    <button
                      key={dept.name}
                      type="button"
                      onClick={() => { onChange(dept.name); setOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 ease-in-out ${
                        isSelected ? 'bg-gray-50 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{dept.name}</span>
                      {isSelected && <Check size={14} className="text-[#0A5540] shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}

            {filtered.length === 0 && search && (
              <p className="text-sm text-gray-400 text-center py-4">No departments found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
