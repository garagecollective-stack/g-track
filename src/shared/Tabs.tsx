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
    <div className={`flex border-b border-gray-200 ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
            active === tab.id
              ? 'border-[#0A5540] text-[#0A5540]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              active === tab.id ? 'bg-[#edf8f4] text-[#0A5540]' : 'bg-gray-100 text-gray-500'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
