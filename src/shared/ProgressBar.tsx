interface Props {
  value: number
  color?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const heights = { sm: 'h-[3px]', md: 'h-[5px]', lg: 'h-2' }

export function ProgressBar({ value, color = '#0A5540', size = 'md', showLabel = false, className = '' }: Props) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-gray-100 dark:bg-[#1F2937] rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className="rounded-full transition-all duration-[400ms] ease-out"
          style={{ width: `${clamped}%`, backgroundColor: color, height: '100%' }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-500 dark:text-[#6B7280] shrink-0 w-8 text-right" style={{ fontFamily: 'JetBrains Mono, DM Mono, monospace', fontFeatureSettings: '"tnum"' }}>
          {clamped}%
        </span>
      )}
    </div>
  )
}
