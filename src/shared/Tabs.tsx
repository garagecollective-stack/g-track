interface Tab {
  id: string
  label: string
  count?: number
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      <div className="flex border-b border-[var(--line-1)] overflow-x-auto scrollbar-hide">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap shrink-0 -mb-px ${
            active === tab.id
              ? 'border-[var(--primary)] text-[var(--ink-900)]'
              : 'border-transparent text-[var(--ink-500)] hover:text-[var(--ink-900)]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
              active === tab.id ? 'bg-[var(--primary-50)] text-[var(--primary-700)]' : 'bg-[var(--surface-2)] text-[var(--ink-500)]'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--canvas)] to-transparent pointer-events-none" />
    </div>
  )
}
