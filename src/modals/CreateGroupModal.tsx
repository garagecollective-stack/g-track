import { useState, useMemo, useEffect } from 'react'
import { Users, X, Search, Check, Smile } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { Avatar } from '../shared/Avatar'
import { useTeam } from '../hooks/useTeam'
import { useChat } from '../context/ChatContext'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'

interface Props { open: boolean; onClose: () => void }

const EMOJI_CHOICES = ['💬', '🚀', '🎨', '⚡', '🔥', '🌱', '☕', '🛠️', '📣', '🎯', '🌟', '🧠']

export function CreateGroupModal({ open, onClose }: Props) {
  const { members } = useTeam()
  const { currentUser } = useApp()
  const { createGroup } = useChat()
  const toast = useToast()

  const [name, setName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState<string>('💬')
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setAvatarEmoji('💬')
      setSelected([])
      setQuery('')
    }
  }, [open])

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members
      .filter(m => m.id !== currentUser?.id && m.is_active !== false)
      .filter(m => !q || m.name.toLowerCase().includes(q) || (m.department ?? '').toLowerCase().includes(q))
  }, [members, currentUser?.id, query])

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Group name is required')
      return
    }
    if (selected.length === 0) {
      toast.error('Add at least one member')
      return
    }
    setSubmitting(true)
    const roomId = await createGroup(name.trim(), selected, avatarEmoji || null)
    setSubmitting(false)
    if (roomId) {
      toast.success(`Group '${name.trim()}' created`)
      onClose()
    }
  }

  const canSubmit = name.trim().length > 0 && selected.length > 0 && !submitting

  return (
    <Modal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="bg-[var(--surface-1)] text-[var(--ink-900)]">
        {/* Header */}
        <div className="-mx-6 -mt-6 px-5 py-4 border-b border-[var(--line-1)] flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-[var(--r-sm)] bg-[var(--primary-50)] flex items-center justify-center shrink-0">
            <Users size={18} className="text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-semibold text-[var(--ink-900)] leading-tight">New group</h2>
            <p className="text-[11.5px] text-[var(--ink-500)] leading-tight mt-0.5">Start a group chat — invite anyone from Garage.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Group identity */}
        <div className="mb-5 flex items-start gap-3">
          <div className="relative group shrink-0">
            <div className="w-14 h-14 rounded-[var(--r-lg)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] flex items-center justify-center text-2xl shadow-sm ring-1 ring-inset ring-white/15">
              <span>{avatarEmoji || '💬'}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Group name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
              placeholder="Marketing war room"
              autoFocus
              className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm bg-[var(--surface-1)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors"
            />
            <p className="text-[11px] text-[var(--ink-400)] mt-1 font-mono tabular-nums">{name.length}/50</p>
          </div>
        </div>

        {/* Emoji picker */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Smile size={12} className="text-[var(--ink-400)]" />
            <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide">Icon</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_CHOICES.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setAvatarEmoji(e)}
                className={`w-9 h-9 rounded-[var(--r-sm)] text-[18px] flex items-center justify-center transition-all ${
                  avatarEmoji === e
                    ? 'bg-[var(--primary-50)] ring-2 ring-[var(--primary)] scale-105'
                    : 'bg-[var(--surface-2)] hover:bg-[var(--primary-50)] hover:ring-1 hover:ring-inset hover:ring-[var(--primary)]/30'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Member picker */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide">Add members</p>
            <span className="text-[11px] font-mono tabular-nums text-[var(--primary)] font-semibold">
              {selected.length} selected
            </span>
          </div>

          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or department"
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-sm)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors"
            />
          </div>

          <div className="border border-[var(--line-1)] rounded-[var(--r-lg)] max-h-[260px] overflow-y-auto">
            {candidates.length === 0 ? (
              <div className="py-8 text-center text-[12.5px] text-[var(--ink-400)]">
                No members match &ldquo;{query}&rdquo;
              </div>
            ) : (
              candidates.map(m => {
                const checked = selected.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left ${
                      checked ? 'bg-[var(--primary-50)]' : 'hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <Avatar name={m.name} size="sm" imageUrl={m.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-[var(--ink-900)] truncate leading-tight">{m.name}</p>
                      <p className="text-[11px] text-[var(--ink-500)] truncate capitalize leading-tight mt-0.5">
                        {m.department || (m.role === 'teamLead' ? 'Team Lead' : m.role)}
                      </p>
                    </div>
                    <span className={`w-5 h-5 rounded-[4px] flex items-center justify-center transition-all shrink-0 ${
                      checked
                        ? 'bg-[var(--primary)] ring-1 ring-inset ring-[var(--primary-700)]'
                        : 'ring-1 ring-inset ring-[var(--line-2)] bg-[var(--surface-1)]'
                    }`}>
                      {checked && <Check size={13} className="text-white" strokeWidth={3} />}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--line-1)] pt-4 -mx-6 px-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--line-1)] rounded-[var(--r-sm)] px-4 py-2.5 text-sm font-medium text-[var(--ink-700)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-700)] text-white rounded-[var(--r-sm)] px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
            Create group
          </button>
        </div>
      </form>
    </Modal>
  )
}
