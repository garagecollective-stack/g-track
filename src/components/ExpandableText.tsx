import { useState } from 'react'

interface Props {
  text: string
  maxLength?: number
  className?: string
}

export function ExpandableText({ text, maxLength = 100, className = '' }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!text) return null

  const isLong = text.length > maxLength
  const displayText = expanded || !isLong
    ? text
    : text.slice(0, maxLength).trimEnd() + '...'

  return (
    <div className={className}>
      <span className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap break-words">
        {displayText}
      </span>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(prev => !prev)
          }}
          className="ml-1.5 text-xs font-medium text-[#0A5540] hover:underline focus:outline-none shrink-0"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
