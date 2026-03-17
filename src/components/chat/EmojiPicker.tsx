import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✅', '👏', '🎉', '💯', '😊', '🙌']

interface Props {
  onReact: (emoji: string) => void
  isOwn: boolean
}

export function EmojiPicker({ onReact, isOwn }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (emoji: string) => {
    onReact(emoji)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        title="React"
        className="p-1 rounded-lg bg-white dark:bg-[#1F2937] border border-gray-100 dark:border-[#374151] text-gray-400 dark:text-[#6B7280] hover:text-gray-700 dark:hover:text-[#B3B3B3] shadow-sm transition-colors"
      >
        <Smile size={11} />
      </button>

      {open && (
        <div className={`absolute bottom-full mb-1 z-50 bg-white dark:bg-[#1F2937] border border-gray-100 dark:border-[#374151] rounded-xl shadow-xl p-1.5 ${
          isOwn ? 'right-0' : 'left-0'
        }`}>
          <div className="grid grid-cols-6 gap-0.5">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="w-7 h-7 flex items-center justify-center text-base rounded-lg hover:bg-gray-100 dark:hover:bg-[#374151] transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
