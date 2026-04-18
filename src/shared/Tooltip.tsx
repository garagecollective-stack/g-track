import { useState } from 'react'

interface Props {
  content: string
  children: React.ReactElement
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, position = 'top' }: Props) {
  const [visible, setVisible] = useState(false)
  const posStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`absolute ${posStyles[position]} z-50 pointer-events-none animate-fade-scale-in`}>
          <div className="bg-[#09090b] text-white text-[11px] font-medium rounded-[var(--r-xs)] px-2 py-1 max-w-[200px] break-words text-center shadow-[var(--shadow-lg)] ring-1 ring-white/10">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}
