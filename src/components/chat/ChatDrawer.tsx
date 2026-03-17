import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  X, ArrowLeft, Plus, Send, UserPlus, MessageSquare,
  Hash, ChevronRight, Search, User,
} from 'lucide-react'
import { isToday, isYesterday, format } from 'date-fns'
import { useChat } from '../../context/ChatContext'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../../shared/LoadingSpinner'
import { Avatar } from '../../shared/Avatar'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage, ChatRoom, RoomMember } from '../../context/ChatContext'
import type { Profile } from '../../types'

// ── helpers ────────────────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
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
      <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white dark:bg-[#0D0D0D] border border-gray-100 dark:border-[#1F2937] rounded-xl shadow-xl overflow-hidden">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider px-4 pt-3 pb-1">
          Add Director
        </p>
        {directors.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-[#6B7280] px-4 py-3">All directors already added</p>
        ) : directors.map(d => (
          <button
            key={d.id}
            onClick={() => handleAdd(d.id)}
            disabled={adding === d.id}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#0A5540]/10 dark:bg-[#22C55E]/10 flex items-center justify-center text-[#0A5540] dark:text-[#22C55E] text-xs font-semibold shrink-0">
              {getInitials(d.name)}
            </div>
            <span className="flex-1 text-left text-sm text-gray-800 dark:text-[#E5E7EB] truncate">{d.name}</span>
            {adding === d.id
              ? <LoadingSpinner size="sm" />
              : <Plus size={13} className="text-gray-400 dark:text-[#6B7280]" />
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
}

export function ChatDrawer() {
  const {
    isOpen, closeChat,
    rooms, activeRoom, activeRoomId, setActiveRoomId,
    messages, typingUsers, sendingMessage,
    sendMessage, sendTyping, markRead,
    startDM, loading, unreadThreshold,
  } = useChat()
  const { currentUser } = useApp()

  const [view, setView]               = useState<DrawerView>('rooms')
  const [tab, setTab]                 = useState<Tab>('department')
  const [input, setInput]             = useState('')
  const [replyTo, setReplyTo]         = useState<ChatMessage | null>(null)
  const [showAddDirector, setShowAddDirector] = useState(false)

  // General tab state
  const [allProfiles, setAllProfiles] = useState<MemberProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [startingDM, setStartingDM]   = useState<string | null>(null)
  const [profilesLoaded, setProfilesLoaded] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  // ── Sync view with activeRoomId ──────────────────────────────────────────────

  useEffect(() => {
    if (activeRoomId) setView('chat')
    else if (view === 'chat') setView('rooms')
  }, [activeRoomId])

  // ── Scroll to bottom on messages ─────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Focus input on chat open ─────────────────────────────────────────────────

  useEffect(() => {
    if (view === 'chat' && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [view, isOpen])

  // ── Mark messages as read when opening a room ────────────────────────────────

  useEffect(() => {
    if (!activeRoomId) return
    const t = setTimeout(() => markRead(activeRoomId), 500)
    return () => clearTimeout(t)
  }, [activeRoomId, markRead])

  // ── Fetch all profiles for General tab ───────────────────────────────────────

  useEffect(() => {
    if (tab !== 'general' || profilesLoaded || !currentUser?.id) return
    supabase
      .from('profiles')
      .select('id, name, role, department, user_status')
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

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    setActiveRoomId(null)
    setView('rooms')
    setReplyTo(null)
    setInput('')
  }, [setActiveRoomId])

  const handleSend = useCallback(async () => {
    if (!activeRoomId || !input.trim()) return
    const text   = input
    const replyId = replyTo?.id
    setInput('')
    setReplyTo(null)
    await sendMessage(activeRoomId, text, replyId)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [activeRoomId, input, replyTo, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
    if (activeRoomId) sendTyping(activeRoomId)
  }

  const handleStartDM = async (profileId: string) => {
    setStartingDM(profileId)
    const roomId = await startDM(profileId)
    setStartingDM(null)
    if (roomId) {
      setTab('department')
      setActiveRoomId(roomId)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const messageGroups = useMemo(() => {
    const groups: { label: string; messages: ChatMessage[] }[] = []
    messages.forEach(msg => {
      const label = getDateLabel(msg.created_at)
      const last  = groups[groups.length - 1]
      if (last?.label === label) last.messages.push(msg)
      else groups.push({ label, messages: [msg] })
    })
    return groups
  }, [messages])

  // First unread message — used to render the "New messages" divider
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

  const deptRooms = rooms.filter(r => r.type === 'department')
  const dmRooms   = rooms.filter(r => r.type === 'dm')
  const deptUnread = deptRooms.reduce((s, r) => s + r.unread_count, 0)

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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 dark:bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeChat}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-screen z-50 w-full md:w-[380px] flex flex-col bg-white dark:bg-[#0D0D0D] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >

        {/* ══════════════════════════════════════════
            HEADER — Rooms view
        ══════════════════════════════════════════ */}
        {view === 'rooms' && (
          <div className="shrink-0">
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1F2937]">
              <div className="flex items-center gap-2">
                <MessageSquare size={17} className="text-[#0A5540] dark:text-[#22C55E]" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Chat</h2>
              </div>
              <div className="flex items-center gap-1.5">
                {/* FIX 5: New DM switches to General tab */}
                <button
                  type="button"
                  onClick={() => setTab('general')}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    tab === 'general'
                      ? 'bg-[#0A5540] dark:bg-[#22C55E] text-white dark:text-black'
                      : 'bg-[#edf8f4] dark:bg-[#22C55E]/10 text-[#0A5540] dark:text-[#22C55E] hover:bg-[#d6f0e8] dark:hover:bg-[#22C55E]/20'
                  }`}
                >
                  <Plus size={13} />
                  New DM
                </button>
                <button
                  onClick={closeChat}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-400 dark:text-[#6B7280] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* FIX 4: Tabs — Department / General */}
            <div className="flex border-b border-gray-100 dark:border-[#1F2937] bg-white dark:bg-[#0D0D0D]">
              {(['department', 'general'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-medium transition-all ${
                    tab === t
                      ? 'text-[#0A5540] dark:text-[#22C55E] border-b-2 border-[#0A5540] dark:border-[#22C55E]'
                      : 'text-gray-400 dark:text-[#6B7280] hover:text-gray-600 dark:hover:text-[#B3B3B3] hover:bg-gray-50 dark:hover:bg-[#141414]'
                  }`}
                >
                  {t === 'department' ? 'Department' : 'General'}
                  {t === 'department' && deptUnread > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center bg-[#0A5540] dark:bg-[#22C55E] text-white dark:text-black text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-1 leading-none">
                      {deptUnread > 9 ? '9+' : deptUnread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            HEADER — Chat view
        ══════════════════════════════════════════ */}
        {view === 'chat' && (
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-[#1F2937] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-500 dark:text-[#6B7280] transition-colors shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                  {roomDisplayName}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-[#6B7280] leading-tight">
                  {activeRoom?.members.length ?? 0} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isTeamLead && activeRoom?.type === 'department' && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddDirector(p => !p)}
                    title="Add Director"
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-400 dark:text-[#6B7280] transition-colors"
                  >
                    <UserPlus size={15} />
                  </button>
                  {showAddDirector && activeRoom && (
                    <AddDirectorPopover room={activeRoom} onClose={() => setShowAddDirector(false)} />
                  )}
                </div>
              )}
              <button
                onClick={closeChat}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-400 dark:text-[#6B7280] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            BODY — Department tab (FIX 1 + FIX 2)
        ══════════════════════════════════════════ */}
        {view === 'rooms' && tab === 'department' && (
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0D0D0D]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-[#0A5540] dark:border-[#22C55E] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Department group rooms */}
                {deptRooms.length > 0 && (
                  <div>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-[#6B7280] uppercase tracking-wide">
                        Department Chat
                      </p>
                    </div>
                    {deptRooms.map(room => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => { setActiveRoomId(room.id); setView('chat') }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors text-left border-b border-gray-50 dark:border-[#1F2937]"
                      >
                        {/* Hash icon */}
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-xl bg-[#0A5540] dark:bg-[#22C55E]/20 flex items-center justify-center">
                            <Hash size={20} className="text-white dark:text-[#22C55E]" />
                          </div>
                          {room.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                              {room.unread_count > 99 ? '99+' : room.unread_count}
                            </span>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {room.name}
                            </span>
                            {room.last_message && (
                              <span className="text-[10px] text-gray-400 dark:text-[#6B7280] shrink-0">
                                {formatRoomTime(room.last_message.created_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-[#6B7280] mt-0.5">
                            {room.members.length} members
                          </p>
                          {room.last_message && (
                            <p className={`text-xs truncate mt-0.5 ${
                              room.unread_count > 0
                                ? 'text-gray-700 dark:text-[#E5E7EB] font-medium'
                                : 'text-gray-400 dark:text-[#6B7280]'
                            }`}>
                              {room.last_message.sender_id === currentUser?.id
                                ? 'You: '
                                : `${room.last_message.sender?.name?.split(' ')[0] ?? ''}: `
                              }
                              {room.last_message.message}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-[#374151] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* DM rooms below department rooms */}
                {dmRooms.length > 0 && (
                  <div>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-[#6B7280] uppercase tracking-wide">
                        Direct Messages
                      </p>
                    </div>
                    {dmRooms.map(room => {
                      const other = getDMOtherMember(room, currentUser?.id ?? '')
                      const displayName = other?.name ?? room.name
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => { setActiveRoomId(room.id); setView('chat') }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors text-left border-b border-gray-50 dark:border-[#1F2937]"
                        >
                          <div className="relative shrink-0">
                            <Avatar
                              name={displayName}
                              size="sm"
                              imageUrl={other?.avatar_url ?? null}
                              status={other?.user_status === 'active' ? 'active' : undefined}
                            />
                            {room.unread_count > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 leading-none">
                                {room.unread_count > 9 ? '9+' : room.unread_count}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</span>
                              {room.last_message && (
                                <span className="text-[10px] text-gray-400 dark:text-[#6B7280] shrink-0">
                                  {formatRoomTime(room.last_message.created_at)}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs truncate mt-0.5 ${
                              room.unread_count > 0
                                ? 'text-gray-700 dark:text-[#E5E7EB] font-medium'
                                : 'text-gray-400 dark:text-[#6B7280]'
                            }`}>
                              {room.last_message
                                ? (room.last_message.sender_id === currentUser?.id ? 'You: ' : '') + room.last_message.message
                                : `${other?.department ?? ''}`
                              }
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 dark:text-[#374151] shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Empty state */}
                {deptRooms.length === 0 && dmRooms.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center mb-3">
                      <Hash size={24} className="text-gray-300 dark:text-[#374151]" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-[#6B7280]">No department chat yet</p>
                    <p className="text-xs text-gray-400 dark:text-[#6B7280] mt-1">Your department channel will appear here</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            BODY — General tab (FIX 3)
        ══════════════════════════════════════════ */}
        {view === 'rooms' && tab === 'general' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-[#1F2937] bg-white dark:bg-[#0D0D0D] shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#1F2937] rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#6B7280] focus:outline-none focus:border-[#0A5540] dark:focus:border-[#22C55E] focus:ring-2 focus:ring-[#0A5540]/10 dark:focus:ring-[#22C55E]/10 transition-all"
                />
              </div>
            </div>

            {/* Member list grouped by dept */}
            <div className="flex-1 overflow-y-auto">
              {!profilesLoaded ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-[#0A5540] dark:border-[#22C55E] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : groupedProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <User size={36} className="text-gray-200 dark:text-[#374151] mb-3" />
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">No members found</p>
                </div>
              ) : (
                groupedProfiles.map(([dept, profiles]) => (
                  <div key={dept}>
                    {/* Sticky dept header */}
                    <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50 dark:bg-[#0D0D0D] border-b border-gray-100 dark:border-[#1F2937]">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-[#6B7280] uppercase tracking-wide">
                        {dept} · {profiles.length}
                      </p>
                    </div>

                    {profiles.map(profile => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleStartDM(profile.id)}
                        disabled={startingDM === profile.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors text-left border-b border-gray-50 dark:border-[#1F2937]"
                      >
                        {/* Avatar with status dot */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[#0A5540] dark:bg-[#22C55E]/20 flex items-center justify-center text-white dark:text-[#22C55E] text-sm font-semibold">
                            {getInitials(profile.name)}
                          </div>
                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#0D0D0D] ${
                            profile.user_status === 'active' ? 'bg-green-500' : 'bg-gray-300 dark:bg-[#374151]'
                          }`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile.name}</p>
                          <p className="text-xs text-gray-400 dark:text-[#6B7280] truncate capitalize">{profile.role === 'teamLead' ? 'Team Lead' : profile.role}</p>
                        </div>

                        {/* Message label / spinner */}
                        {startingDM === profile.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <span className="shrink-0 text-xs font-medium text-[#0A5540] dark:text-[#22C55E] bg-[#edf8f4] dark:bg-[#22C55E]/10 px-2.5 py-1 rounded-full">
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
            BODY — Chat view (FIX 6)
        ══════════════════════════════════════════ */}
        {view === 'chat' && (
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 bg-gray-50 dark:bg-[#0B0F0C]">
              {messageGroups.map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-[#1F2937]" />
                    <span className="text-[11px] text-gray-500 dark:text-[#6B7280] font-medium shrink-0 bg-gray-200 dark:bg-[#1F2937] px-2 py-0.5 rounded-full">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-[#1F2937]" />
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
                        {/* "New messages" divider — shown once before the first unread */}
                        {msg.id === firstUnreadId && (
                          <div className="flex items-center gap-2 my-2 px-1">
                            <div className="flex-1 h-px bg-[#0A5540]/20 dark:bg-[#22C55E]/20" />
                            <span className="text-[11px] font-semibold text-[#0A5540] dark:text-[#22C55E] bg-[#0A5540]/10 dark:bg-[#22C55E]/10 px-2.5 py-0.5 rounded-full shrink-0">
                              New messages
                            </span>
                            <div className="flex-1 h-px bg-[#0A5540]/20 dark:bg-[#22C55E]/20" />
                          </div>
                        )}
                        <MessageBubble
                          message={msg}
                          onReply={setReplyTo}
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
                <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
                  <MessageSquare size={28} className="text-gray-300 dark:text-[#374151]" />
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">No messages yet. Say hi!</p>
                </div>
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 px-2 pt-1">
                  <div className="flex gap-0.5 bg-white dark:bg-[#1F2937] rounded-full px-2 py-1.5 shadow-sm border border-gray-100 dark:border-[#374151]">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#6B7280] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-[#6B7280] italic">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="shrink-0 bg-white dark:bg-[#0D0D0D] border-t border-gray-200 dark:border-[#1F2937] px-3 py-2.5">
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 dark:bg-[#141414] border-l-4 border-[#0A5540] dark:border-[#22C55E] rounded-r-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#0A5540] dark:text-[#22C55E] truncate">
                      {replyTo.sender?.name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#6B7280] truncate">
                      {replyTo.message.slice(0, 60)}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-gray-400 dark:text-[#6B7280] hover:text-gray-600 dark:hover:text-[#B3B3B3] shrink-0 p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#141414] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#6B7280] focus:outline-none focus:border-[#0A5540] dark:focus:border-[#22C55E] transition-colors leading-relaxed overflow-y-auto"
                  style={{ scrollbarWidth: 'none', minHeight: '38px', maxHeight: '120px' }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sendingMessage}
                  className="p-2.5 rounded-xl bg-[#0A5540] dark:bg-[#22C55E] hover:bg-[#0d6b51] dark:hover:bg-[#16A34A] disabled:opacity-40 transition-colors shrink-0 text-white dark:text-black shadow-sm"
                >
                  {sendingMessage ? <LoadingSpinner size="sm" color="currentColor" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
