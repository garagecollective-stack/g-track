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
        className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-[9px] pr-8 text-sm text-gray-900 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {placeholder && !value && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}
