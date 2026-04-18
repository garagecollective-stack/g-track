import { useState, useMemo, useEffect } from 'react'
import {
  Users, X, Search, Check, Smile, Pencil, UserPlus, UserMinus,
  Trash2, LogOut, ShieldCheck, Save,
} from 'lucide-react'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { Avatar } from '../shared/Avatar'
import { useTeam } from '../hooks/useTeam'
import { useChat } from '../context/ChatContext'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import type { ChatRoom } from '../context/ChatContext'

interface Props {
  open: boolean
  onClose: () => void
  room: ChatRoom | null
}

const EMOJI_CHOICES = ['💬', '🚀', '🎨', '⚡', '🔥', '🌱', '☕', '🛠️', '📣', '🎯', '🌟', '🧠']

type Pane = 'overview' | 'add'

export function GroupSettingsModal({ open, onClose, room }: Props) {
  const { members } = useTeam()
  const { currentUser } = useApp()
  const { updateGroup, addGroupMembers, removeGroupMember, deleteGroup } = useChat()
  const toast = useToast()

  const [pane, setPane] = useState<Pane>('overview')
  const [name, setName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState<string>('💬')
  const [editingIdentity, setEditingIdentity] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)

  const [query, setQuery] = useState('')
  const [selectedAdds, setSelectedAdds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isCreator = !!room?.created_by && room.created_by === currentUser?.id

  useEffect(() => {
    if (open && room) {
      setPane('overview')
      setName(room.name)
      setAvatarEmoji(room.avatar_emoji ?? '💬')
      setEditingIdentity(false)
      setQuery('')
      setSelectedAdds([])
    }
  }, [open, room])

  const memberIds = useMemo(() => new Set(room?.members.map(m => m.id) ?? []), [room?.members])

  const addCandidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members
      .filter(m => m.id !== currentUser?.id && m.is_active !== false && !memberIds.has(m.id))
      .filter(m => !q || m.name.toLowerCase().includes(q) || (m.department ?? '').toLowerCase().includes(q))
  }, [members, currentUser?.id, memberIds, query])

  if (!room) return null

  const toRemove = confirmRemoveId ? room.members.find(m => m.id === confirmRemoveId) : null

  const identityDirty = name.trim() !== room.name || (avatarEmoji ?? '') !== (room.avatar_emoji ?? '💬')

  const handleSaveIdentity = async () => {
    if (!name.trim()) { toast.error('Group name is required'); return }
    setSavingIdentity(true)
    const ok = await updateGroup(room.id, name.trim(), avatarEmoji)
    setSavingIdentity(false)
    if (ok) {
      toast.success('Group updated')
      setEditingIdentity(false)
    }
  }

  const toggleAdd = (id: string) => {
    setSelectedAdds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleAddMembers = async () => {
    if (!selectedAdds.length) return
    setAdding(true)
    const ok = await addGroupMembers(room.id, selectedAdds)
    setAdding(false)
    if (ok) {
      toast.success(`Added ${selectedAdds.length} member${selectedAdds.length > 1 ? 's' : ''}`)
      setSelectedAdds([])
      setQuery('')
      setPane('overview')
    }
  }

  const handleConfirmRemove = async () => {
    if (!confirmRemoveId) return
    setRemoving(confirmRemoveId)
    const ok = await removeGroupMember(room.id, confirmRemoveId)
    setRemoving(null)
    setConfirmRemoveId(null)
    if (ok) toast.success('Member removed')
  }

  const handleLeave = async () => {
    if (!currentUser?.id) return
    setBusy(true)
    const ok = await removeGroupMember(room.id, currentUser.id)
    setBusy(false)
    setConfirmLeave(false)
    if (ok) {
      toast.success(`Left '${room.name}'`)
      onClose()
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    const ok = await deleteGroup(room.id)
    setBusy(false)
    setConfirmDelete(false)
    if (ok) {
      toast.success(`Group '${room.name}' deleted`)
      onClose()
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} size="md">
        <div className="bg-[var(--surface-1)] text-[var(--ink-900)]">
          {/* Header */}
          <div className="-mx-6 -mt-6 px-5 py-4 border-b border-[var(--line-1)] flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-[var(--r-sm)] bg-[var(--primary-50)] flex items-center justify-center shrink-0">
              <Users size={18} className="text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-[var(--ink-900)] leading-tight truncate">Group settings</h2>
              <p className="text-[11.5px] text-[var(--ink-500)] leading-tight mt-0.5 flex items-center gap-1">
                {isCreator && <ShieldCheck size={10} className="text-[var(--primary)]" />}
                {isCreator ? 'You are the group admin' : 'You are a member'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {pane === 'overview' && (
            <>
              {/* Identity */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide">Identity</p>
                  {isCreator && !editingIdentity && (
                    <button
                      type="button"
                      onClick={() => setEditingIdentity(true)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--primary)] hover:text-[var(--primary-700)] transition-colors"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-[var(--r-lg)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] flex items-center justify-center text-2xl shadow-sm ring-1 ring-inset ring-white/15 shrink-0">
                    <span>{avatarEmoji || '💬'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingIdentity ? (
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={50}
                        className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm bg-[var(--surface-1)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors"
                      />
                    ) : (
                      <>
                        <p className="text-[15px] font-bold text-[var(--ink-900)] leading-tight flex items-center gap-1.5">
                          <span>{room.avatar_emoji ?? '💬'}</span>
                          {room.name}
                        </p>
                        <p className="text-[11.5px] text-[var(--ink-500)] leading-tight mt-1 font-mono tabular-nums">
                          {room.members.length} members
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {editingIdentity && (
                  <>
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Smile size={11} className="text-[var(--ink-400)]" />
                        <p className="text-[10.5px] font-semibold text-[var(--ink-400)] uppercase tracking-wide">Icon</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {EMOJI_CHOICES.map(e => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setAvatarEmoji(e)}
                            className={`w-8 h-8 rounded-[var(--r-sm)] text-[16px] flex items-center justify-center transition-all ${
                              avatarEmoji === e
                                ? 'bg-[var(--primary-50)] ring-2 ring-[var(--primary)] scale-105'
                                : 'bg-[var(--surface-2)] hover:bg-[var(--primary-50)]'
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIdentity(false)
                          setName(room.name)
                          setAvatarEmoji(room.avatar_emoji ?? '💬')
                        }}
                        className="border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-700)] hover:bg-[var(--surface-2)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveIdentity}
                        disabled={!identityDirty || savingIdentity}
                        className="inline-flex items-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-700)] text-white rounded-[var(--r-sm)] px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {savingIdentity
                          ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                          : <Save size={12} />}
                        Save
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Members list */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide">
                    Members <span className="font-mono tabular-nums ml-1 text-[var(--ink-700)]">{room.members.length}</span>
                  </p>
                  {isCreator && (
                    <button
                      type="button"
                      onClick={() => setPane('add')}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--primary)] hover:text-[var(--primary-700)] transition-colors"
                    >
                      <UserPlus size={11} /> Add members
                    </button>
                  )}
                </div>

                <div className="border border-[var(--line-1)] rounded-[var(--r-lg)] max-h-[240px] overflow-y-auto">
                  {room.members.map(m => {
                    const isSelf = m.id === currentUser?.id
                    const isMemberCreator = m.id === room.created_by
                    const canRemove = isCreator && !isMemberCreator && !isSelf
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <Avatar name={m.name} size="sm" imageUrl={m.avatar_url} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold text-[var(--ink-900)] truncate leading-tight flex items-center gap-1.5">
                            {m.name}
                            {isSelf && <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)]">(you)</span>}
                            {isMemberCreator && (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[var(--primary)] bg-[var(--primary-50)] px-1.5 py-0.5 rounded-full ring-1 ring-inset ring-[var(--primary)]/20 uppercase tracking-wide">
                                <ShieldCheck size={9} /> Admin
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[var(--ink-500)] truncate capitalize leading-tight mt-0.5">
                            {m.department || (m.role === 'teamLead' ? 'Team Lead' : m.role)}
                          </p>
                        </div>
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(m.id)}
                            disabled={removing === m.id}
                            title={`Remove ${m.name}`}
                            className="p-1.5 rounded-[var(--r-sm)] text-[var(--ink-400)] hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Danger zone */}
              <div className="border-t border-[var(--line-1)] -mx-6 px-6 pt-4">
                <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide mb-2">Danger zone</p>
                <div className="flex flex-col gap-2">
                  {!isCreator && (
                    <button
                      type="button"
                      onClick={() => setConfirmLeave(true)}
                      className="w-full inline-flex items-center justify-center gap-2 border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2.5 text-[13px] font-semibold text-[var(--ink-700)] hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <LogOut size={13} /> Leave group
                    </button>
                  )}
                  {isCreator && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-[var(--r-sm)] px-3 py-2.5 text-[13px] font-semibold transition-colors"
                    >
                      <Trash2 size={13} /> Delete group
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {pane === 'add' && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide">Add members</p>
                <button
                  type="button"
                  onClick={() => { setPane('overview'); setSelectedAdds([]); setQuery('') }}
                  className="text-[11.5px] font-semibold text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors"
                >
                  Back
                </button>
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

              <div className="border border-[var(--line-1)] rounded-[var(--r-lg)] max-h-[300px] overflow-y-auto mb-4">
                {addCandidates.length === 0 ? (
                  <div className="py-8 text-center text-[12.5px] text-[var(--ink-400)]">
                    {query ? `No members match "${query}"` : 'Everyone is already in this group'}
                  </div>
                ) : (
                  addCandidates.map(m => {
                    const checked = selectedAdds.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAdd(m.id)}
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

              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-mono tabular-nums text-[var(--primary)] font-semibold">
                  {selectedAdds.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setPane('overview'); setSelectedAdds([]); setQuery('') }}
                    className="border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] font-medium text-[var(--ink-700)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={selectedAdds.length === 0 || adding}
                    className="inline-flex items-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-700)] text-white rounded-[var(--r-sm)] px-4 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {adding
                      ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                      : <UserPlus size={12} />}
                    Add to group
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmRemoveId}
        onClose={() => setConfirmRemoveId(null)}
        onConfirm={handleConfirmRemove}
        title={`Remove ${toRemove?.name ?? 'member'}?`}
        message={`${toRemove?.name ?? 'This member'} will lose access to '${room.name}' and its message history.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={!!removing}
      />

      <ConfirmDialog
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeave}
        title={`Leave '${room.name}'?`}
        message="You will no longer receive messages in this group. You can be re-added by the admin."
        confirmLabel="Leave group"
        cancelLabel="Stay"
        variant="warning"
        isLoading={busy}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={`Delete '${room.name}'?`}
        message="This permanently deletes the group, all its messages, and removes every member. This cannot be undone."
        confirmLabel="Delete group"
        cancelLabel="Cancel"
        variant="danger"
        typeToConfirm={room.name}
        isLoading={busy}
      />
    </>
  )
}
