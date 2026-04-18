import { useEffect, useRef, useState } from 'react'
import { Smile, X, BellOff, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDistanceToNow } from 'date-fns'

interface Preset {
  emoji: string
  text: string
}

const STATUS_PRESETS: Preset[] = [
  { emoji: '💬', text: 'In a meeting' },
  { emoji: '🎯', text: 'Focused — heads down' },
  { emoji: '🍽️', text: 'Out to lunch' },
  { emoji: '🤒', text: 'Out sick' },
  { emoji: '🌴', text: 'On vacation' },
  { emoji: '🏠', text: 'Working from home' },
  { emoji: '🚗', text: 'Commuting' },
  { emoji: '📴', text: 'Off the grid' },
]

const EXPIRY_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour',     minutes: 60 },
  { label: '4 hours',    minutes: 240 },
  { label: 'Today',      minutes: -1 },
  { label: "Don't clear", minutes: null },
]

const DND_OPTIONS: { label: string; minutes: number }[] = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour',     minutes: 60 },
  { label: '2 hours',    minutes: 120 },
  { label: 'Until tomorrow', minutes: -1 },
]

interface Props {
  open: boolean
  onClose: () => void
  anchor?: 'top' | 'bottom'
}

export function StatusEditor({ open, onClose, anchor = 'top' }: Props) {
  const { currentUser, setStatus, clearStatus, setDND, clearDND, addToast } = useApp()
  const ref = useRef<HTMLDivElement>(null)

  const [text, setText]   = useState(currentUser?.status_text ?? '')
  const [emoji, setEmoji] = useState(currentUser?.status_emoji ?? '💬')
  const [expiryMinutes, setExpiryMinutes] = useState<number | null>(60)
  const [showEmojiGrid, setShowEmojiGrid] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setText(currentUser?.status_text ?? '')
    setEmoji(currentUser?.status_emoji ?? '💬')
    setExpiryMinutes(60)
  }, [open, currentUser?.status_text, currentUser?.status_emoji])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const computeExpiry = (mins: number | null): string | null => {
    if (mins === null) return null
    if (mins === -1) {
      const d = new Date()
      d.setHours(23, 59, 59, 999)
      return d.toISOString()
    }
    return new Date(Date.now() + mins * 60_000).toISOString()
  }

  const applyPreset = async (p: Preset) => {
    setEmoji(p.emoji)
    setText(p.text)
    setSaving(true)
    try {
      await setStatus(p.text, p.emoji, computeExpiry(expiryMinutes))
      addToast({ type: 'success', title: 'Status updated', message: `${p.emoji} ${p.text}` })
      onClose()
    } catch (e) {
      addToast({ type: 'error', title: 'Could not update status', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }

  const saveCustom = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await setStatus(text.trim(), emoji, computeExpiry(expiryMinutes))
      addToast({ type: 'success', title: 'Status updated' })
      onClose()
    } catch (e) {
      addToast({ type: 'error', title: 'Could not update status', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }

  const handleClearStatus = async () => {
    setSaving(true)
    try {
      await clearStatus()
      addToast({ type: 'success', title: 'Status cleared' })
      onClose()
    } catch (e) {
      addToast({ type: 'error', title: 'Could not clear status', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }

  const enableDND = async (mins: number) => {
    const until = mins === -1
      ? (() => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(8,0,0,0); return d.toISOString() })()
      : new Date(Date.now() + mins * 60_000).toISOString()
    try {
      await setDND(until)
      addToast({ type: 'success', title: 'Do Not Disturb enabled', message: `Until ${new Date(until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` })
    } catch (e) {
      addToast({ type: 'error', title: 'Could not enable DND', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  const disableDND = async () => {
    try {
      await clearDND()
      addToast({ type: 'success', title: 'Do Not Disturb disabled' })
    } catch (e) {
      addToast({ type: 'error', title: 'Could not disable DND', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  const dndActive = currentUser?.dnd_until && new Date(currentUser.dnd_until).getTime() > Date.now()
  const hasStatus = !!currentUser?.status_text

  const posClass = anchor === 'top' ? 'top-full mt-2' : 'bottom-full mb-2'

  return (
    <div
      ref={ref}
      className={`absolute right-0 ${posClass} w-[360px] max-w-[calc(100vw-1rem)] bg-[var(--surface-1)] dark:bg-[#0D0D0D] border border-[var(--line-1)] dark:border-[#1F2937] rounded-[var(--r-lg)] shadow-2xl z-[70] overflow-hidden`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line-1)] dark:border-[#1F2937]">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--ink-900)]">Set a status</h3>
        <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-900)]">
          <X size={16} />
        </button>
      </div>

      {/* Current status line */}
      {hasStatus && (
        <div className="px-4 py-2.5 bg-[var(--primary-50)]/40 border-b border-[var(--line-1)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{currentUser?.status_emoji ?? '💬'}</span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-[var(--ink-900)] truncate">{currentUser?.status_text}</p>
              {currentUser?.status_expires_at && (
                <p className="text-[10.5px] text-[var(--ink-500)]">clears in {formatDistanceToNow(new Date(currentUser.status_expires_at))}</p>
              )}
            </div>
          </div>
          <button onClick={handleClearStatus} disabled={saving} className="text-[11px] font-semibold text-[var(--ink-500)] hover:text-red-500 px-2 py-1 rounded transition-colors">
            Clear
          </button>
        </div>
      )}

      {/* Custom input */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-stretch gap-2 border border-[var(--line-1)] rounded-[var(--r-sm)] bg-[var(--surface-2)]/40 focus-within:border-[var(--primary)] transition-colors">
          <button
            onClick={() => setShowEmojiGrid(p => !p)}
            className="px-2.5 text-base border-r border-[var(--line-1)] hover:bg-[var(--surface-2)] transition-colors"
          >
            {emoji}
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 100))}
            onKeyDown={(e) => e.key === 'Enter' && saveCustom()}
            placeholder="What's your status?"
            maxLength={100}
            className="flex-1 bg-transparent text-[13px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] py-2 pr-3 focus:outline-none"
          />
        </div>
        {showEmojiGrid && (
          <div className="mt-2 grid grid-cols-8 gap-1 p-2 bg-[var(--surface-2)]/60 border border-[var(--line-1)] rounded-[var(--r-sm)]">
            {['💬','🎯','🍽️','🤒','🌴','🏠','🚗','📴','📅','🎉','☕','📚','🎧','💻','🔥','👀'].map(em => (
              <button
                key={em}
                onClick={() => { setEmoji(em); setShowEmojiGrid(false) }}
                className={`h-7 text-base rounded hover:bg-[var(--surface-1)] transition-colors ${em === emoji ? 'bg-[var(--primary-50)] ring-1 ring-[var(--primary)]' : ''}`}
              >
                {em}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Clock size={12} className="text-[var(--ink-400)] shrink-0" />
          <select
            value={expiryMinutes === null ? 'null' : String(expiryMinutes)}
            onChange={(e) => setExpiryMinutes(e.target.value === 'null' ? null : Number(e.target.value))}
            className="flex-1 text-[11.5px] bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-xs)] px-2 py-1 text-[var(--ink-700)] focus:outline-none focus:border-[var(--primary)]"
          >
            {EXPIRY_OPTIONS.map(o => (
              <option key={o.label} value={o.minutes === null ? 'null' : String(o.minutes)}>
                Clear after · {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={saveCustom}
            disabled={!text.trim() || saving}
            className="text-[11.5px] font-bold px-3 py-1 rounded-[var(--r-xs)] bg-[var(--primary)] text-white disabled:opacity-50 hover:bg-[var(--primary-600)] transition-colors"
          >
            Set
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="px-2 pb-2 pt-1">
        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-400)]">Suggestions</p>
        <div className="flex flex-col">
          {STATUS_PRESETS.map(p => (
            <button
              key={p.text}
              onClick={() => applyPreset(p)}
              disabled={saving}
              className="flex items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-xs)] transition-colors disabled:opacity-50"
            >
              <span className="text-base shrink-0">{p.emoji}</span>
              <span className="truncate">{p.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DND */}
      <div className="px-4 py-3 border-t border-[var(--line-1)] dark:border-[#1F2937] bg-[var(--surface-2)]/30">
        <div className="flex items-center gap-2 mb-2">
          <BellOff size={13} className={dndActive ? 'text-[var(--warning)]' : 'text-[var(--ink-500)]'} />
          <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--ink-700)]">Do Not Disturb</span>
        </div>
        {dndActive ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11.5px] text-[var(--ink-500)]">
              Silent until <span className="font-semibold text-[var(--warning)]">{new Date(currentUser!.dnd_until!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </p>
            <button onClick={disableDND} className="text-[11px] font-semibold px-2 py-1 rounded text-[var(--ink-700)] hover:bg-[var(--surface-2)] transition-colors">
              Turn off
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {DND_OPTIONS.map(o => (
              <button
                key={o.label}
                onClick={() => enableDND(o.minutes)}
                className="text-[11px] px-2 py-1 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-xs)] text-[var(--ink-700)] hover:border-[var(--warning)] hover:text-[var(--warning)] transition-colors"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Utility used by other chat/UI areas to render an inline status chip.
export function StatusChip({ emoji, text, size = 'sm' }: { emoji?: string | null; text?: string | null; size?: 'xs' | 'sm' }) {
  if (!text) return null
  const padding = size === 'xs' ? 'px-1.5 py-[1px] text-[10px]' : 'px-2 py-0.5 text-[11px]'
  return (
    <span className={`inline-flex items-center gap-1 ${padding} rounded-full bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--line-1)] text-[var(--ink-700)] max-w-[180px]`}>
      {emoji && <span className="leading-none">{emoji}</span>}
      <span className="truncate">{text}</span>
    </span>
  )
}

// Re-export Smile so callers don't need a second lucide import just for the trigger button
export { Smile as StatusIcon }
