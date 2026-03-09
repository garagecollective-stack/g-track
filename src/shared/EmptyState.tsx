import { type LucideIcon } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && <Icon size={40} className="text-gray-200 mb-4" />}
      <p className="text-base font-medium text-gray-500">{title}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
