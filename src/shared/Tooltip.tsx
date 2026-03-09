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
        <div className={`absolute ${posStyles[position]} z-50 pointer-events-none whitespace-nowrap`}>
          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}
