import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  X, ArrowLeft, Plus, Send, UserPlus, MessageSquare,
  Hash, Search, User, Edit3, Smile, AtSign, Reply, Users, Settings,
  Slash, ClipboardList, AlertTriangle, UserCheck, Pin, ChevronDown, ChevronUp,
} from 'lucide-react'
import { isToday, isYesterday, format } from 'date-fns'
import { useChat } from '../../context/ChatContext'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../../shared/LoadingSpinner'
import { Avatar } from '../../shared/Avatar'
import { MessageBubble } from './MessageBubble'
import { CreateGroupModal } from '../../modals/CreateGroupModal'
import { GroupSettingsModal } from '../../modals/GroupSettingsModal'
import { ThreadPanel } from './ThreadPanel'
import { AssignTaskModal } from '../../modals/AssignTaskModal'
import { RaiseIssueModal } from '../../modals/RaiseIssueModal'
import type { ChatMessage, ChatRoom, RoomMember } from '../../context/ChatContext'
import type { Profile } from '../../types'

// ── Slash commands ─────────────────────────────────────────────────────────────

type SlashAction = 'task' | 'raise-issue' | 'assign'

interface SlashCommand {
  key: SlashAction
  label: string
  trigger: string
  description: string
  icon: typeof ClipboardList
}

const SLASH_COMMANDS: SlashCommand[] = [
  { key: 'task',        trigger: '/task',        label: 'New task',    description: 'Create a task in any project', icon: ClipboardList },
  { key: 'raise-issue', trigger: '/raise-issue', label: 'Raise issue', description: 'Flag a blocker for triage',     icon: AlertTriangle },
  { key: 'assign',      trigger: '/assign',      label: 'Assign task', description: 'Create and assign to a member', icon: UserCheck },
]

// ── helpers ────────────────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

function formatRoomTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday'
  if (diffMs < 6 * 86400000) return format(date, 'EEE')
  return format(date, 'MMM d')
}

function getDMOtherMember(room: ChatRoom, currentUserId: string): RoomMember | undefined {
  return room.members.find(m => m.id !== currentUserId)
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

// ── AddDirectorPopover ─────────────────────────────────────────────────────────

function AddDirectorPopover({ room, onClose }: { room: ChatRoom; onClose: () => void }) {
  const { addDirectorToRoom } = useChat()
  const [directors, setDirectors] = useState<Profile[]>([])
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    const existingIds = room.members.map(m => m.id)
    supabase
      .from('profiles')
      .select('id, name, avatar_url, role, department, is_active')
      .eq('role', 'director')
      .eq('is_active', true)
      .then(({ data }) => {
        setDirectors(((data as Profile[]) ?? []).filter(d => !existingIds.includes(d.id)))
      })
  }, [room.members])

  const handleAdd = async (directorId: string) => {
    setAdding(directorId)
    await addDirectorToRoom(room.id, directorId)
    setAdding(null)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 w-60 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] shadow-xl overflow-hidden">
        <p className="eyebrow text-[var(--ink-400)] px-3 pt-2.5 pb-1.5">Add director</p>
        {directors.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-400)] px-3 pb-3">All directors already added</p>
        ) : directors.map(d => (
          <button
            key={d.id}
            onClick={() => handleAdd(d.id)}
            disabled={adding === d.id}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--surface-2)] transition-colors"
          >
            <div className="w-7 h-7 rounded-[var(--r-sm)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
              {getInitials(d.name)}
            </div>
            <span className="flex-1 text-left text-[13px] text-[var(--ink-900)] truncate">{d.name}</span>
            {adding === d.id
              ? <LoadingSpinner size="sm" />
              : <Plus size={13} className="text-[var(--ink-400)]" />
            }
          </button>
        ))}
      </div>
    </>
  )
}

// ── ChatDrawer ─────────────────────────────────────────────────────────────────

type DrawerView = 'rooms' | 'chat'
type Tab = 'department' | 'general'

interface MemberProfile {
  id: string
  name: string
  role: string
  department: string | null
  user_status: string | null
  avatar_url: string | null
}

export function ChatDrawer() {
  const {
    isOpen, closeChat,
    rooms, activeRoom, activeRoomId, setActiveRoomId,
    messages, typingUsers, sendingMessage,
    sendMessage, sendTyping, markRead,
    startDM, loading, unreadThreshold,
    markThreadRead, threadUnread, threadReplyCounts,
  } = useChat()
  const { currentUser } = useApp()

  const [view, setView] = useState<DrawerView>('rooms')
  const [tab, setTab] = useState<Tab>('department')
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [threadRoot, setThreadRoot] = useState<ChatMessage | null>(null)

  // Close thread panel when active room changes
  useEffect(() => { setThreadRoot(null) }, [activeRoomId])

  // Keep the thread root in sync with the live message (picks up edits/pin/delete)
  useEffect(() => {
    if (!threadRoot) return
    const live = messages.find(m => m.id === threadRoot.id)
    if (live && live !== threadRoot) setThreadRoot(live)
  }, [messages, threadRoot])
  const [showAddDirector, setShowAddDirector] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)

  // Slash commands
  const [showSlash, setShowSlash] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)
  const [slashAction, setSlashAction] = useState<SlashAction | null>(null)

  // @mention picker state
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  // General tab state
  const [allProfiles, setAllProfiles] = useState<MemberProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [startingDM, setStartingDM] = useState<string | null>(null)
  const [profilesLoaded, setProfilesLoaded] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const goToChatView = useCallback(() => setView('chat'), [])
  const goToRoomsView = useCallback(() => setView('rooms'), [])

  useEffect(() => {
    if (activeRoomId) goToChatView()
    else if (view === 'chat') goToRoomsView()
  }, [activeRoomId, view, goToChatView, goToRoomsView])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (view === 'chat' && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [view, isOpen])

  useEffect(() => {
    if (!activeRoomId) return
    const t = setTimeout(() => markRead(activeRoomId), 500)
    return () => clearTimeout(t)
  }, [activeRoomId, markRead])

  useEffect(() => {
    if (tab !== 'general' || profilesLoaded || !currentUser?.id) return
    supabase
      .from('profiles')
      .select('id, name, role, department, user_status, avatar_url')
      .neq('role', 'director')
      .neq('role', 'super_admin')
      .eq('is_active', true)
      .neq('id', currentUser.id)
      .order('department')
      .order('name')
      .then(({ data }) => {
        setAllProfiles((data as MemberProfile[]) ?? [])
        setProfilesLoaded(true)
      })
  }, [tab, profilesLoaded, currentUser?.id])

  const handleBack = useCallback(() => {
    setActiveRoomId(null)
    goToRoomsView()
    setReplyTo(null)
    setInput('')
  }, [setActiveRoomId, goToRoomsView])

  const handleSend = useCallback(async () => {
    if (!activeRoomId || !input.trim()) return
    const text = input
    const replyId = replyTo?.id
    setInput('')
    setReplyTo(null)
    await sendMessage(activeRoomId, text, replyId)
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [activeRoomId, input, replyTo, sendMessage])

  // ── @mention helpers ─────────────────────────────────────────────────────────

  const mentionCandidates = useMemo(() => {
    if (!activeRoom) return []
    const q = mentionFilter.trim().toLowerCase()
    return activeRoom.members
      .filter(m => m.id !== currentUser?.id)
      .filter(m => !q || m.name.toLowerCase().includes(q) || (m.department ?? '').toLowerCase().includes(q))
      .slice(0, 6)
  }, [activeRoom, mentionFilter, currentUser?.id])

  const detectMentionTrigger = (value: string, cursorPos: number) => {
    const before = value.slice(0, cursorPos)
    // @ must be at start or after whitespace, then capture word chars after it
    const m = before.match(/(?:^|\s)@(\w*)$/)
    if (!m) return null
    return { filter: m[1], atIndex: cursorPos - m[1].length - 1 }
  }

  const insertMention = (memberName: string) => {
    const firstName = memberName.split(' ')[0]
    const ta = inputRef.current
    if (!ta) {
      setInput(prev => prev.replace(/@\w*$/, `@${firstName} `))
      setShowMentions(false); setMentionFilter('')
      return
    }
    const cursorPos = ta.selectionStart ?? input.length
    const before = input.slice(0, cursorPos)
    const atIdx = before.lastIndexOf('@')
    if (atIdx === -1) { setShowMentions(false); return }
    const newValue = input.slice(0, atIdx) + `@${firstName} ` + input.slice(cursorPos)
    setInput(newValue)
    setShowMentions(false)
    setMentionFilter('')
    setMentionIndex(0)
    queueMicrotask(() => {
      if (!ta) return
      const pos = atIdx + firstName.length + 2
      ta.focus()
      ta.setSelectionRange(pos, pos)
    })
  }

  const handleMentionButton = () => {
    const ta = inputRef.current
    if (!ta) return
    ta.focus()
    if (showMentions) { setShowMentions(false); return }
    const pos = ta.selectionStart ?? input.length
    const prevChar = input[pos - 1]
    const needsSpace = pos > 0 && prevChar !== undefined && prevChar !== ' ' && prevChar !== '\n'
    const toInsert = needsSpace ? ' @' : '@'
    const newValue = input.slice(0, pos) + toInsert + input.slice(pos)
    setInput(newValue)
    setMentionFilter('')
    setMentionIndex(0)
    setShowMentions(true)
    queueMicrotask(() => {
      if (!ta) return
      const newPos = pos + toInsert.length
      ta.focus()
      ta.setSelectionRange(newPos, newPos)
    })
  }

  // ── Slash-command helpers ────────────────────────────────────────────────────

  const slashCandidates = useMemo(() => {
    const q = slashFilter.trim().toLowerCase()
    return SLASH_COMMANDS.filter(c =>
      !q || c.trigger.slice(1).toLowerCase().startsWith(q) || c.label.toLowerCase().includes(q)
    )
  }, [slashFilter])

  const detectSlashTrigger = (value: string) => {
    // Slash menu only triggers when `/` is at the start of the compose field
    const m = value.match(/^\/(\S*)$/)
    if (!m) return null
    return { filter: m[1] }
  }

  const runSlashCommand = (action: SlashAction) => {
    setShowSlash(false)
    setSlashFilter('')
    setSlashIndex(0)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSlashAction(action)
  }

  const closeSlashModal = () => {
    setSlashAction(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash && slashCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashIndex(i => (i + 1) % slashCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashIndex(i => (i - 1 + slashCandidates.length) % slashCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const target = slashCandidates[Math.min(slashIndex, slashCandidates.length - 1)]
        if (target) runSlashCommand(target.key)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSlash(false)
        return
      }
    }
    if (showMentions && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % mentionCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => (i - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const target = mentionCandidates[Math.min(mentionIndex, mentionCandidates.length - 1)]
        if (target) insertMention(target.name)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentions(false)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
    if (activeRoomId) sendTyping(activeRoomId)

    const slashTrigger = detectSlashTrigger(val)
    if (slashTrigger) {
      setSlashFilter(slashTrigger.filter)
      setSlashIndex(0)
      setShowSlash(true)
      setShowMentions(false)
      return
    }
    setShowSlash(false)

    const trigger = detectMentionTrigger(val, e.target.selectionStart ?? val.length)
    if (trigger) {
      setMentionFilter(trigger.filter)
      setMentionIndex(0)
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const handleStartDM = async (profileId: string) => {
    setStartingDM(profileId)
    const roomId = await startDM(profileId)
    setStartingDM(null)
    if (roomId) {
      setTab('department')
      setActiveRoomId(roomId)
      goToChatView()
    }
  }

  // Root-level messages only — thread replies are moved to the thread panel
  const rootMessages = useMemo(
    () => messages.filter(m => !m.thread_root_id),
    [messages]
  )

  const messageGroups = useMemo(() => {
    const groups: { label: string; messages: ChatMessage[] }[] = []
    rootMessages.forEach(msg => {
      const label = getDateLabel(msg.created_at)
      const last = groups[groups.length - 1]
      if (last?.label === label) last.messages.push(msg)
      else groups.push({ label, messages: [msg] })
    })
    return groups
  }, [rootMessages])

  const firstUnreadId = useMemo(() => {
    if (!unreadThreshold) return null
    for (const group of messageGroups) {
      for (const msg of group.messages) {
        if (msg.sender_id !== currentUser?.id && msg.created_at > unreadThreshold) {
          return msg.id
        }
      }
    }
    return null
  }, [messageGroups, unreadThreshold, currentUser?.id])

  const pinnedMessages = useMemo(() => messages.filter(m => m.is_pinned && !m.is_deleted), [messages])
  const [pinShelfOpen, setPinShelfOpen] = useState(false)

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.animate(
      [
        { background: 'color-mix(in srgb, var(--primary) 22%, transparent)' },
        { background: 'transparent' },
      ],
      { duration: 1400, easing: 'ease-out' }
    )
  }, [])

  const deptRooms = rooms.filter(r => r.type === 'department')
  const dmRooms = rooms.filter(r => r.type === 'dm')
  const groupRooms = rooms.filter(r => r.type === 'group')
  const deptUnread = deptRooms.reduce((s, r) => s + r.unread_count, 0) + groupRooms.reduce((s, r) => s + r.unread_count, 0)

  const roomDisplayName = activeRoom
    ? activeRoom.type === 'dm'
      ? getDMOtherMember(activeRoom, currentUser?.id ?? '')?.name ?? activeRoom.name
      : activeRoom.name
    : ''

  const isTeamLead = currentUser?.role === 'teamLead'

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return allProfiles
    const q = searchQuery.toLowerCase()
    return allProfiles.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.department ?? '').toLowerCase().includes(q)
    )
  }, [allProfiles, searchQuery])

  const groupedProfiles = useMemo(() => {
    const map: Record<string, MemberProfile[]> = {}
    filteredProfiles.forEach(p => {
      const dept = p.department ?? 'Other'
      if (!map[dept]) map[dept] = []
      map[dept].push(p)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredProfiles])

  const dmOther = activeRoom?.type === 'dm' ? getDMOtherMember(activeRoom, currentUser?.id ?? '') : undefined

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/25 dark:bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeChat}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 z-50 w-full md:w-[400px] lg:w-[460px] flex flex-col bg-[var(--surface-1)] shadow-2xl border-l border-[var(--line-1)] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ height: '100dvh' }}
      >

        {/* ══════════════════════════════════════════
            HEADER — Rooms view (Slack workspace header)
        ══════════════════════════════════════════ */}
        {view === 'rooms' && (
          <div className="shrink-0">
            {/* Workspace strip */}
            <div className="px-4 pt-4 pb-3 bg-gradient-to-b from-[var(--primary)] to-[var(--primary-700)] text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-grid opacity-[0.08] pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[var(--r-sm)] bg-white/15 backdrop-blur-sm ring-1 ring-inset ring-white/20 flex items-center justify-center">
                    <MessageSquare size={14} className="text-white" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold leading-tight">Garage Collective</p>
                    <p className="text-[11px] text-white/70 leading-tight flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-soft-pulse" />
                      {currentUser?.name?.split(' ')[0] ?? 'You'} · active
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(true)}
                    title="New group"
                    className="p-2 rounded-[var(--r-sm)] hover:bg-white/15 text-white/90 hover:text-white transition-colors"
                  >
                    <Users size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('general')}
                    title="New message"
                    className="p-2 rounded-[var(--r-sm)] hover:bg-white/15 text-white/90 hover:text-white transition-colors"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={closeChat}
                    className="p-2 rounded-[var(--r-sm)] hover:bg-white/15 text-white/90 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mt-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
                <input
                  type="text"
                  placeholder={tab === 'general' ? 'Search members' : 'Jump to channel or DM'}
                  value={tab === 'general' ? searchQuery : ''}
                  onChange={e => { if (tab === 'general') setSearchQuery(e.target.value) }}
                  onFocus={() => { if (tab !== 'general') setTab('general') }}
                  className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-white/15 text-white placeholder:text-white/60 rounded-[var(--r-sm)] ring-1 ring-inset ring-white/20 focus:bg-white/20 focus:ring-white/40 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Slack-style tab strip */}
            <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-[var(--line-1)]">
              {(['department', 'general'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold transition-colors ${
                    tab === t
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                  }`}
                >
                  {t === 'department' ? 'Channels' : 'Directory'}
                  {t === 'department' && deptUnread > 0 && (
                    <span className="inline-flex items-center justify-center bg-[var(--primary)] text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 leading-none font-mono tabular-nums">
                      {deptUnread > 9 ? '9+' : deptUnread}
                    </span>
                  )}
                  {tab === t && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            HEADER — Chat view (Slack channel header)
        ══════════════════════════════════════════ */}
        {view === 'chat' && (
          <div className="flex items-center justify-between px-2 py-2 border-b border-[var(--line-1)] bg-[var(--surface-1)] shrink-0">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <button
                onClick={handleBack}
                className="p-2 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] text-[var(--ink-500)] transition-colors shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
              {activeRoom?.type === 'dm' ? (
                <div className="flex items-center gap-2 min-w-0 px-1.5">
                  <div className="relative shrink-0">
                    <Avatar name={roomDisplayName} size="sm" imageUrl={dmOther?.avatar_url ?? null} />
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-1)] ${
                      dmOther?.dnd_until && new Date(dmOther.dnd_until).getTime() > Date.now()
                        ? 'bg-[var(--warning)]'
                        : dmOther?.user_status === 'active' ? 'bg-[#4ade80]' : 'bg-[var(--ink-400)]'
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[var(--ink-900)] truncate leading-tight flex items-center gap-1.5">
                      <span className="truncate">{roomDisplayName}</span>
                      {dmOther?.status_emoji && <span className="text-[13px]">{dmOther.status_emoji}</span>}
                    </p>
                    <p className="text-[11px] text-[var(--ink-500)] leading-tight truncate">
                      {dmOther?.dnd_until && new Date(dmOther.dnd_until).getTime() > Date.now()
                        ? <span className="text-[var(--warning)] font-semibold">🔕 Do not disturb</span>
                        : dmOther?.status_text
                          ? <span className="italic">{dmOther.status_text}</span>
                          : <span className="capitalize">{dmOther?.user_status === 'active' ? 'Active now' : 'Away'}</span>
                      }
                    </p>
                  </div>
                </div>
              ) : activeRoom?.type === 'group' ? (
                <button
                  type="button"
                  onClick={() => setShowGroupSettings(true)}
                  className="flex items-center gap-2 min-w-0 px-1.5 py-1 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors text-left"
                  title="Group settings"
                >
                  <div className="w-8 h-8 rounded-[var(--r-sm)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] flex items-center justify-center text-[14px] shrink-0 shadow-sm">
                    {activeRoom.avatar_emoji ?? '💬'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[var(--ink-900)] truncate leading-tight">
                      {roomDisplayName}
                    </p>
                    <p className="text-[11px] text-[var(--ink-500)] leading-tight font-mono tabular-nums flex items-center gap-1">
                      <Users size={10} strokeWidth={2.2} />
                      {activeRoom.members.length} members
                    </p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 px-1.5">
                  <Hash size={18} className="text-[var(--ink-500)] shrink-0" strokeWidth={2.4} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[var(--ink-900)] truncate leading-tight">
                      {roomDisplayName}
                    </p>
                    <p className="text-[11px] text-[var(--ink-500)] leading-tight font-mono tabular-nums">
                      {activeRoom?.members.length ?? 0} members
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {isTeamLead && activeRoom?.type === 'department' && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddDirector(p => !p)}
                    title="Add director"
                    className="p-2 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] text-[var(--ink-500)] transition-colors"
                  >
                    <UserPlus size={15} />
                  </button>
                  {showAddDirector && activeRoom && (
                    <AddDirectorPopover room={activeRoom} onClose={() => setShowAddDirector(false)} />
                  )}
                </div>
              )}
              {activeRoom?.type === 'group' && (
                <button
                  onClick={() => setShowGroupSettings(true)}
                  title="Group settings"
                  className="p-2 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] text-[var(--ink-500)] transition-colors"
                >
                  <Settings size={15} />
                </button>
              )}
              <button
                onClick={closeChat}
                className="p-2 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] text-[var(--ink-500)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            BODY — Channels (Slack sidebar style)
        ══════════════════════════════════════════ */}
        {view === 'rooms' && tab === 'department' && (
          <div className="flex-1 overflow-y-auto bg-[var(--surface-1)]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="py-2">
                {/* Channels section */}
                {deptRooms.length > 0 && (
                  <div className="mb-1">
                    <div className="flex items-center justify-between px-4 py-1.5">
                      <p className="eyebrow text-[var(--ink-400)]">Channels</p>
                      <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)]">{deptRooms.length}</span>
                    </div>
                    {deptRooms.map(room => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => { setActiveRoomId(room.id); setView('chat') }}
                        className={`group w-full flex items-center gap-2 px-4 py-1.5 transition-colors text-left ${
                          room.unread_count > 0
                            ? 'bg-[var(--primary-50)] hover:bg-[var(--primary-100)]'
                            : 'hover:bg-[var(--surface-2)]'
                        }`}
                      >
                        <Hash
                          size={15}
                          strokeWidth={2.2}
                          className={room.unread_count > 0 ? 'text-[var(--primary)]' : 'text-[var(--ink-400)] group-hover:text-[var(--ink-700)]'}
                        />
                        <span className={`flex-1 truncate text-[14px] ${
                          room.unread_count > 0
                            ? 'font-bold text-[var(--ink-900)]'
                            : 'font-medium text-[var(--ink-700)]'
                        }`}>
                          {room.name}
                        </span>
                        {room.last_message && (
                          <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)] shrink-0">
                            {formatRoomTime(room.last_message.created_at)}
                          </span>
                        )}
                        {room.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center bg-[var(--primary)] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 leading-none font-mono tabular-nums shrink-0">
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Groups section */}
                <div className="mt-3">
                  <div className="flex items-center justify-between px-4 py-1.5">
                    <p className="eyebrow text-[var(--ink-400)]">Groups</p>
                    <button
                      type="button"
                      onClick={() => setShowCreateGroup(true)}
                      title="New group"
                      className="text-[var(--ink-400)] hover:text-[var(--primary)] transition-colors p-0.5"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  {groupRooms.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateGroup(true)}
                      className="mx-3 mt-1 mb-1 w-[calc(100%-1.5rem)] flex items-center gap-2 px-3 py-2 rounded-[var(--r-sm)] border border-dashed border-[var(--line-1)] text-left hover:border-[var(--primary)] hover:bg-[var(--primary-50)] transition-colors group"
                    >
                      <span className="w-7 h-7 rounded-[var(--r-sm)] bg-[var(--surface-2)] group-hover:bg-white flex items-center justify-center">
                        <Users size={13} className="text-[var(--ink-400)] group-hover:text-[var(--primary)]" strokeWidth={2.2} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--ink-700)] group-hover:text-[var(--primary)] leading-tight">Create a group</p>
                        <p className="text-[11px] text-[var(--ink-400)] leading-tight mt-0.5">Start a chat with anyone at Garage</p>
                      </div>
                      <Plus size={14} className="text-[var(--ink-400)] group-hover:text-[var(--primary)] shrink-0" />
                    </button>
                  ) : (
                    groupRooms.map(room => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => { setActiveRoomId(room.id); setView('chat') }}
                        className={`group w-full flex items-center gap-2 px-4 py-1.5 transition-colors text-left ${
                          room.unread_count > 0
                            ? 'bg-[var(--primary-50)] hover:bg-[var(--primary-100)]'
                            : 'hover:bg-[var(--surface-2)]'
                        }`}
                      >
                        {room.avatar_emoji ? (
                          <span className="w-5 h-5 flex items-center justify-center text-[14px] leading-none shrink-0">{room.avatar_emoji}</span>
                        ) : (
                          <Users
                            size={15}
                            strokeWidth={2.2}
                            className={room.unread_count > 0 ? 'text-[var(--primary)]' : 'text-[var(--ink-400)] group-hover:text-[var(--ink-700)]'}
                          />
                        )}
                        <span className={`flex-1 truncate text-[14px] ${
                          room.unread_count > 0
                            ? 'font-bold text-[var(--ink-900)]'
                            : 'font-medium text-[var(--ink-700)]'
                        }`}>
                          {room.name}
                        </span>
                        <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)] shrink-0">
                          {room.members.length}
                        </span>
                        {room.last_message && (
                          <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)] shrink-0">
                            {formatRoomTime(room.last_message.created_at)}
                          </span>
                        )}
                        {room.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center bg-[var(--primary)] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 leading-none font-mono tabular-nums shrink-0">
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Direct messages section */}
                {dmRooms.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between px-4 py-1.5">
                      <p className="eyebrow text-[var(--ink-400)]">Direct messages</p>
                      <button
                        type="button"
                        onClick={() => setTab('general')}
                        title="New DM"
                        className="text-[var(--ink-400)] hover:text-[var(--primary)] transition-colors p-0.5"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    {dmRooms.map(room => {
                      const other = getDMOtherMember(room, currentUser?.id ?? '')
                      const displayName = other?.name ?? room.name
                      const isActive = other?.user_status === 'active'
                      const otherDnd = other?.dnd_until && new Date(other.dnd_until).getTime() > Date.now()
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => { setActiveRoomId(room.id); setView('chat') }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 transition-colors text-left ${
                            room.unread_count > 0
                              ? 'bg-[var(--primary-50)] hover:bg-[var(--primary-100)]'
                              : 'hover:bg-[var(--surface-2)]'
                          }`}
                        >
                          <div className="relative shrink-0">
                            <Avatar name={displayName} size="xs" imageUrl={other?.avatar_url ?? null} />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-1)] ${
                              otherDnd ? 'bg-[var(--warning)]' : isActive ? 'bg-[#22c55e]' : 'bg-[var(--ink-400)]'
                            }`} />
                          </div>
                          <span className={`flex-1 truncate text-[14px] flex items-center gap-1.5 ${
                            room.unread_count > 0
                              ? 'font-bold text-[var(--ink-900)]'
                              : 'font-medium text-[var(--ink-700)]'
                          }`}>
                            <span className="truncate">{displayName}</span>
                            {other?.status_emoji && <span className="text-[12px] shrink-0" title={other.status_text ?? ''}>{other.status_emoji}</span>}
                            {otherDnd && <span className="text-[10px] shrink-0" title="Do not disturb">🔕</span>}
                          </span>
                          {room.last_message && (
                            <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)] shrink-0">
                              {formatRoomTime(room.last_message.created_at)}
                            </span>
                          )}
                          {room.unread_count > 0 && (
                            <span className="inline-flex items-center justify-center bg-[var(--primary)] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 leading-none font-mono tabular-nums shrink-0">
                              {room.unread_count > 9 ? '9+' : room.unread_count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Empty state */}
                {deptRooms.length === 0 && dmRooms.length === 0 && groupRooms.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--line-1)] flex items-center justify-center mb-3">
                      <Hash size={22} className="text-[var(--ink-400)]" strokeWidth={2.2} />
                    </div>
                    <p className="text-[14px] font-semibold text-[var(--ink-700)]">No channels yet</p>
                    <p className="text-[12px] text-[var(--ink-500)] mt-1">Your department channel will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            BODY — Directory
        ══════════════════════════════════════════ */}
        {view === 'rooms' && tab === 'general' && (
          <div className="flex flex-col flex-1 overflow-hidden bg-[var(--surface-1)]">
            <div className="flex-1 overflow-y-auto">
              {!profilesLoaded ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : groupedProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <User size={28} className="text-[var(--ink-400)] mb-2" />
                  <p className="text-[13px] text-[var(--ink-500)]">No members found</p>
                </div>
              ) : (
                groupedProfiles.map(([dept, profiles]) => (
                  <div key={dept} className="mb-1">
                    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 bg-[var(--surface-1)] border-b border-[var(--line-1)]">
                      <p className="eyebrow text-[var(--ink-400)]">{dept}</p>
                      <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)]">{profiles.length}</span>
                    </div>

                    {profiles.map(profile => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleStartDM(profile.id)}
                        disabled={startingDM === profile.id}
                        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[var(--surface-2)] transition-colors text-left group"
                      >
                        <div className="relative shrink-0">
                          <Avatar name={profile.name} size="sm" imageUrl={profile.avatar_url ?? null} />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-1)] ${
                            profile.user_status === 'active' ? 'bg-[#22c55e]' : 'bg-[var(--ink-400)]'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold text-[var(--ink-900)] truncate leading-tight">{profile.name}</p>
                          <p className="text-[11px] text-[var(--ink-500)] truncate capitalize leading-tight mt-0.5">
                            {profile.role === 'teamLead' ? 'Team Lead' : profile.role}
                          </p>
                        </div>
                        {startingDM === profile.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-[var(--primary)] bg-[var(--primary-50)] px-2 py-0.5 rounded-full ring-1 ring-inset ring-[var(--primary)]/20">
                            Message
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            BODY — Chat (Slack message feed)
        ══════════════════════════════════════════ */}
        {view === 'chat' && (
          <>
            {/* Pin shelf */}
            {pinnedMessages.length > 0 && (
              <div className="shrink-0 border-b border-[var(--line-1)] bg-[var(--surface-2)]/60">
                <button
                  type="button"
                  onClick={() => setPinShelfOpen(o => !o)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Pin size={11} className="text-[var(--primary)] shrink-0" strokeWidth={2.4} />
                  <span className="text-[11.5px] font-semibold text-[var(--ink-700)]">
                    {pinnedMessages.length} pinned message{pinnedMessages.length === 1 ? '' : 's'}
                  </span>
                  {!pinShelfOpen && pinnedMessages[0] && (
                    <span className="flex-1 truncate text-[11.5px] text-[var(--ink-500)] font-normal">
                      · {pinnedMessages[pinnedMessages.length - 1].message.slice(0, 60)}
                    </span>
                  )}
                  {pinShelfOpen
                    ? <ChevronUp size={12} className="ml-auto text-[var(--ink-400)] shrink-0" />
                    : <ChevronDown size={12} className="ml-auto text-[var(--ink-400)] shrink-0" />}
                </button>
                {pinShelfOpen && (
                  <div className="max-h-[180px] overflow-y-auto border-t border-[var(--line-1)]">
                    {pinnedMessages.map(pm => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => { scrollToMessage(pm.id); setPinShelfOpen(false) }}
                        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[var(--surface-1)] transition-colors border-b border-[var(--line-1)] last:border-b-0"
                      >
                        <Pin size={10} className="text-[var(--primary)] mt-1 shrink-0" strokeWidth={2.4} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11.5px] font-semibold text-[var(--ink-900)] truncate">
                              {pm.sender?.name ?? 'Unknown'}
                            </span>
                            <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)]">
                              {format(new Date(pm.created_at), 'MMM d · h:mm a')}
                            </span>
                          </div>
                          <p className="text-[12.5px] text-[var(--ink-700)] line-clamp-2 leading-snug">
                            {pm.message}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-2 bg-[var(--surface-1)]">
              {messageGroups.map(group => (
                <div key={group.label}>
                  {/* Sticky date divider */}
                  <div className="sticky top-0 z-10 flex items-center justify-center py-2 pointer-events-none">
                    <div className="absolute inset-x-3 top-1/2 h-px bg-[var(--line-1)]" />
                    <span className="relative text-[11px] font-semibold text-[var(--ink-700)] bg-[var(--surface-1)] border border-[var(--line-1)] rounded-full px-3 py-0.5 shadow-sm pointer-events-auto">
                      {group.label}
                    </span>
                  </div>

                  {group.messages.map((msg, i) => {
                    const prev = group.messages[i - 1]
                    const next = group.messages[i + 1]
                    const prevSame = prev && prev.sender_id === msg.sender_id &&
                      (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60 * 1000
                    const nextSame = next && next.sender_id === msg.sender_id &&
                      (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime()) < 5 * 60 * 1000
                    const isUnread = unreadThreshold
                      && msg.created_at > unreadThreshold
                      && msg.sender_id !== currentUser?.id
                    return (
                      <Fragment key={msg.id}>
                        {msg.id === firstUnreadId && (
                          <div className="flex items-center gap-2 my-2 px-3">
                            <div className="flex-1 h-px bg-red-400/40" />
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider shrink-0">
                              New
                            </span>
                            <div className="flex-1 h-px bg-red-400/40" />
                          </div>
                        )}
                        <MessageBubble
                          message={msg}
                          onReply={setReplyTo}
                          onOpenThread={setThreadRoot}
                          threadReplyCount={threadReplyCounts[msg.id] ?? 0}
                          threadUnread={threadUnread[msg.id] ?? 0}
                          showAvatar={!nextSame}
                          showSenderName={!prevSame}
                          isUnread={!!isUnread}
                        />
                      </Fragment>
                    )
                  })}
                </div>
              ))}

              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16 px-6 text-center">
                  {activeRoom?.type === 'dm' ? (
                    <>
                      <Avatar name={roomDisplayName} size="lg" imageUrl={dmOther?.avatar_url ?? null} />
                      <div>
                        <p className="font-display text-lg text-[var(--ink-900)]">{roomDisplayName}</p>
                        <p className="text-[12px] text-[var(--ink-500)] mt-1">
                          This is the beginning of your direct message history.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-[var(--primary-50)] ring-1 ring-inset ring-[var(--primary)]/20 flex items-center justify-center">
                        <Hash size={22} className="text-[var(--primary)]" strokeWidth={2.4} />
                      </div>
                      <div>
                        <p className="font-display text-lg text-[var(--ink-900)]">Welcome to #{roomDisplayName}</p>
                        <p className="text-[12px] text-[var(--ink-500)] mt-1">
                          This is the start of the channel. Say hi.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 px-4 pt-1 pb-1 text-[11.5px] text-[var(--ink-500)] italic">
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1 h-1 bg-[var(--ink-500)] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                  <span>
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Slack-style compose */}
            <div className="shrink-0 bg-[var(--surface-1)] px-3 pt-2 relative" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
              {/* Slash-command picker */}
              {showSlash && slashCandidates.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 z-50 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-md)] shadow-xl overflow-hidden animate-fade-scale-in">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-2)] border-b border-[var(--line-1)]">
                    <p className="eyebrow text-[var(--ink-400)] flex items-center gap-1">
                      <Slash size={10} />
                      Commands {slashFilter && <span className="text-[var(--primary)] font-mono normal-case tracking-normal">· /{slashFilter}</span>}
                    </p>
                    <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)]">
                      ↑↓ · ↵ · esc
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {slashCandidates.map((cmd, i) => {
                      const Icon = cmd.icon
                      return (
                        <button
                          key={cmd.key}
                          type="button"
                          onMouseEnter={() => setSlashIndex(i)}
                          onMouseDown={e => { e.preventDefault(); runSlashCommand(cmd.key) }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                            i === slashIndex ? 'bg-[var(--primary-50)]' : 'hover:bg-[var(--surface-2)]'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-[var(--r-sm)] flex items-center justify-center shrink-0 ${
                            i === slashIndex
                              ? 'bg-[var(--primary)] text-white'
                              : 'bg-[var(--surface-2)] text-[var(--ink-500)]'
                          }`}>
                            <Icon size={13} strokeWidth={2.2} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold text-[var(--ink-900)] truncate leading-tight">{cmd.label}</span>
                            <span className="block text-[11px] text-[var(--ink-500)] truncate leading-tight mt-0.5">{cmd.description}</span>
                          </span>
                          <span className={`text-[10.5px] font-mono tabular-nums shrink-0 ${
                            i === slashIndex ? 'text-[var(--primary)]' : 'text-[var(--ink-400)]'
                          }`}>
                            {cmd.trigger}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* @mention picker */}
              {showMentions && mentionCandidates.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 z-50 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-md)] shadow-xl overflow-hidden animate-fade-scale-in">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-2)] border-b border-[var(--line-1)]">
                    <p className="eyebrow text-[var(--ink-400)]">
                      People {mentionFilter && <span className="text-[var(--primary)] font-mono normal-case tracking-normal">· @{mentionFilter}</span>}
                    </p>
                    <span className="text-[10px] font-mono tabular-nums text-[var(--ink-400)]">
                      ↑↓ to move · ↵ to pick · esc
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {mentionCandidates.map((m, i) => (
                      <button
                        key={m.id}
                        type="button"
                        onMouseEnter={() => setMentionIndex(i)}
                        onMouseDown={e => { e.preventDefault(); insertMention(m.name) }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                          i === mentionIndex ? 'bg-[var(--primary-50)]' : 'hover:bg-[var(--surface-2)]'
                        }`}
                      >
                        <Avatar name={m.name} size="xs" imageUrl={m.avatar_url ?? null} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-[var(--ink-900)] truncate leading-tight">{m.name}</span>
                          {m.department && (
                            <span className="block text-[11px] text-[var(--ink-500)] truncate leading-tight mt-0.5">{m.department}</span>
                          )}
                        </span>
                        <span className={`text-[11px] font-mono tabular-nums shrink-0 ${
                          i === mentionIndex ? 'text-[var(--primary)]' : 'text-[var(--ink-400)]'
                        }`}>
                          @{m.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {replyTo && (
                <div className="flex items-start gap-2 mb-1.5 px-3 py-2 bg-[var(--surface-2)] border-l-2 border-[var(--primary)] rounded-r-[var(--r-sm)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--primary)] flex items-center gap-1">
                      <Reply size={10} /> Replying to {replyTo.sender?.name ?? 'Unknown'}
                    </p>
                    <p className="text-[12px] text-[var(--ink-500)] truncate mt-0.5">
                      {replyTo.message.slice(0, 80)}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-[var(--ink-400)] hover:text-[var(--ink-900)] shrink-0 p-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/15 transition-all overflow-hidden">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeRoom?.type === 'dm' ? roomDisplayName : `#${roomDisplayName}`}`}
                  rows={1}
                  className="w-full resize-none text-[14px] px-3 pt-2.5 pb-1.5 bg-transparent text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none leading-relaxed overflow-y-auto"
                  style={{ scrollbarWidth: 'none', minHeight: '40px', maxHeight: '140px' }}
                />
                <div className="flex items-center justify-between px-2 pb-1.5">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      title="Mention someone"
                      onClick={handleMentionButton}
                      className={`p-1.5 rounded-[var(--r-xs)] transition-colors ${
                        showMentions
                          ? 'bg-[var(--primary-50)] text-[var(--primary)]'
                          : 'text-[var(--ink-400)] hover:text-[var(--ink-900)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <AtSign size={14} />
                    </button>
                    <button type="button" title="Emoji" className="p-1.5 rounded-[var(--r-xs)] text-[var(--ink-400)] hover:text-[var(--ink-900)] hover:bg-[var(--surface-2)] transition-colors">
                      <Smile size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || sendingMessage}
                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-[var(--r-xs)] text-[12px] font-semibold transition-all ${
                      input.trim() && !sendingMessage
                        ? 'bg-[var(--primary)] hover:bg-[var(--primary-700)] text-white shadow-sm'
                        : 'bg-[var(--surface-2)] text-[var(--ink-400)] cursor-not-allowed'
                    }`}
                  >
                    {sendingMessage ? <LoadingSpinner size="sm" color="currentColor" /> : <><Send size={12} strokeWidth={2.4} /> Send</>}
                  </button>
                </div>
              </div>
              <p className="text-[10.5px] text-[var(--ink-400)] mt-1.5 px-1 flex items-center gap-1">
                <kbd className="font-mono tabular-nums px-1 py-0 rounded bg-[var(--surface-2)] text-[var(--ink-700)] text-[10px]">Enter</kbd>
                to send ·
                <kbd className="font-mono tabular-nums px-1 py-0 rounded bg-[var(--surface-2)] text-[var(--ink-700)] text-[10px]">Shift+Enter</kbd>
                for new line
              </p>
            </div>
          </>
        )}
      </div>

      {/* Thread panel — sibling of drawer so it overlays over both list & chat views */}
      <ThreadPanel root={threadRoot} onClose={() => setThreadRoot(null)} />

      {/* Create-group modal — sibling of drawer so fixed positioning is viewport-relative */}
      <CreateGroupModal open={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
      <GroupSettingsModal
        open={showGroupSettings && activeRoom?.type === 'group'}
        onClose={() => setShowGroupSettings(false)}
        room={activeRoom?.type === 'group' ? activeRoom : null}
      />

      {/* Slash-command modals */}
      <AssignTaskModal
        open={slashAction === 'task' || slashAction === 'assign'}
        onClose={closeSlashModal}
      />
      <RaiseIssueModal
        open={slashAction === 'raise-issue'}
        onClose={closeSlashModal}
      />
    </>
  )
}
