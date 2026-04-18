import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Dropdown({ options, value, onChange, placeholder = 'Select...', className = '', disabled }: Props) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] pr-8 text-[13px] text-[var(--ink-900)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {placeholder && !value && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
    </div>
  )
}
