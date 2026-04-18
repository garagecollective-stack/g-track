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
        className="p-1 rounded-[var(--r-sm)] bg-[var(--surface-1)] dark:bg-[#1F2937] border border-[var(--line-1)] dark:border-[#374151] text-[var(--ink-400)] dark:text-[#6B7280] hover:text-[var(--ink-700)] dark:hover:text-[#B3B3B3] shadow-sm transition-colors"
      >
        <Smile size={11} />
      </button>

      {open && (
        <div className={`absolute bottom-full mb-1 z-50 bg-[var(--surface-1)] dark:bg-[#1F2937] border border-[var(--line-1)] dark:border-[#374151] rounded-[var(--r-lg)] shadow-xl p-1.5 max-w-[calc(100vw-2rem)] ${
          isOwn ? 'right-0' : 'left-0'
        }`}>
          <div className="grid grid-cols-6 gap-1">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="w-7 h-7 flex items-center justify-center text-base rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] dark:hover:bg-[#374151] transition-colors"
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
