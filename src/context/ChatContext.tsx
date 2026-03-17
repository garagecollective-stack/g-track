import {
  createContext, useContext, useState,
  useEffect, useRef, useCallback,
} from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from './AppContext'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatProfile {
  id: string
  name: string
  avatar_url: string | null
  role: string
  department: string | null
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  message: string
  reply_to_id: string | null
  reactions: Record<string, string[]>
  is_deleted: boolean
  deleted_for_everyone: boolean
  deleted_for_sender: boolean
  edited_at: string | null
  read_by: string[]
  delivered_to: string[]
  created_at: string
  sender?: ChatProfile | null
  // Client-side stitched from loaded messages (no PostgREST self-join needed)
  reply_to?: {
    id: string
    message: string
    sender_id: string
    senderName: string
    deleted_for_everyone: boolean
  } | null
}

export interface RoomMember {
  id: string
  name: string
  avatar_url: string | null
  role: string
  department: string | null
  is_active: boolean
  user_status?: string
  last_seen?: string | null
  last_read_at: string
}

export interface ChatRoom {
  id: string
  type: 'department' | 'dm'
  department: string | null
  name: string
  members: RoomMember[]
  last_message?: ChatMessage | null
  unread_count: number
}

// ── MSG_SELECT — no self-referential join (causes PostgREST 400) ───────────────

const MSG_SELECT = `
  *,
  sender:profiles!chat_messages_sender_id_fkey(id, name, avatar_url, role, department)
`

// ── Context shape ─────────────────────────────────────────────────────────────

interface ChatContextType {
  rooms: ChatRoom[]
  activeRoom: ChatRoom | null
  activeRoomId: string | null
  setActiveRoomId: (id: string | null) => void
  messages: ChatMessage[]
  typingUsers: string[]
  loading: boolean
  sendingMessage: boolean
  totalUnread: number
  isOpen: boolean
  openChat: (roomId?: string | null) => void
  closeChat: () => void
  sendMessage: (roomId: string, message: string, replyToId?: string) => Promise<void>
  toggleReaction: (messageId: string, emoji: string) => Promise<void>
  deleteForMe: (messageId: string) => Promise<void>
  deleteForEveryone: (messageId: string) => Promise<void>
  sendTyping: (roomId: string) => Promise<void>
  startDM: (otherUserId: string) => Promise<string | null>
  addDirectorToRoom: (roomId: string, directorId: string) => Promise<void>
  fetchRooms: () => Promise<void>
  markRoomAsRead: (roomId: string) => Promise<void>
  markRead: (roomId: string) => Promise<void>
  markDelivered: (messageIds: string[]) => Promise<void>
  unreadThreshold: string | null
}

const ChatContext = createContext<ChatContextType | null>(null)

// ── Helper: stitch reply_to client-side ───────────────────────────────────────

function stitchReplyTo(raw: ChatMessage[]): ChatMessage[] {
  const byId: Record<string, ChatMessage> = {}
  raw.forEach(m => { byId[m.id] = m })
  return raw.map(m => ({
    ...m,
    reply_to: m.reply_to_id
      ? (() => {
          const parent = byId[m.reply_to_id!]
          if (!parent) return null
          return {
            id: parent.id,
            message: parent.message,
            sender_id: parent.sender_id,
            senderName: parent.sender?.name ?? 'Unknown',
            deleted_for_everyone: parent.deleted_for_everyone ?? false,
          }
        })()
      : null,
  }))
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, addToast } = useApp()

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const notifChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [unreadThreshold, setUnreadThreshold] = useState<string | null>(null)

  // Stable refs so async callbacks always read current values without re-subscribing
  const addToastRef       = useRef(addToast)
  const isOpenRef         = useRef(isOpen)
  const activeRoomIdRef   = useRef(activeRoomId)
  const roomsRef          = useRef(rooms)
  const currentUserRef    = useRef(currentUser)
  useEffect(() => { addToastRef.current = addToast }, [addToast])
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])
  useEffect(() => { activeRoomIdRef.current = activeRoomId }, [activeRoomId])
  useEffect(() => { roomsRef.current = rooms }, [rooms])
  useEffect(() => { currentUserRef.current = currentUser }, [currentUser])

  const activeRoom = rooms.find(r => r.id === activeRoomId) ?? null
  const totalUnread = rooms.reduce((sum, r) => sum + r.unread_count, 0)

  // ── Drawer ──────────────────────────────────────────────────────────────────

  const openChat = useCallback((roomId?: string | null) => {
    if (roomId) setActiveRoomId(roomId)
    setIsOpen(true)
  }, [])

  const closeChat = useCallback(() => setIsOpen(false), [])

  // ── markRoomAsRead ──────────────────────────────────────────────────────────

  const markRoomAsRead = useCallback(async (roomId: string) => {
    if (!currentUser?.id) return
    await supabase
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', currentUser.id)
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unread_count: 0 } : r))
  }, [currentUser?.id])

  // ── markRead (per-message read_by) ─────────────────────────────────────────

  const markRead = useCallback(async (roomId: string) => {
    if (!currentUser?.id) return
    const unread = messages.filter(
      m => m.sender_id !== currentUser.id && !(m.read_by ?? []).includes(currentUser.id)
    )
    for (const m of unread) {
      const readBy = m.read_by ?? []
      if (!readBy.includes(currentUser.id)) {
        await supabase
          .from('chat_messages')
          .update({ read_by: [...readBy, currentUser.id] })
          .eq('id', m.id)
        setMessages(prev => prev.map(msg =>
          msg.id === m.id ? { ...msg, read_by: [...readBy, currentUser.id!] } : msg
        ))
      }
    }
    await markRoomAsRead(roomId)
  }, [currentUser?.id, messages, markRoomAsRead])

  // ── markDelivered ───────────────────────────────────────────────────────────

  const markDelivered = useCallback(async (messageIds: string[]) => {
    if (!currentUser?.id || !messageIds.length) return
    for (const id of messageIds) {
      const msg = messages.find(m => m.id === id)
      if (!msg) continue
      const delivered = msg.delivered_to ?? []
      if (!delivered.includes(currentUser.id)) {
        await supabase
          .from('chat_messages')
          .update({ delivered_to: [...delivered, currentUser.id] })
          .eq('id', id)
      }
    }
  }, [currentUser?.id, messages])

  // ── fetchRooms ──────────────────────────────────────────────────────────────

  const fetchRooms = useCallback(async () => {
    if (!currentUser?.id || currentUser.role === 'director') return
    setLoading(true)

    const { data: memberRows } = await supabase
      .from('chat_room_members')
      .select('room_id, last_read_at')
      .eq('user_id', currentUser.id)

    if (!memberRows?.length) { setLoading(false); return }

    const roomIds = memberRows.map(r => r.room_id)

    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select('*')
      .in('id', roomIds)

    if (!roomData) { setLoading(false); return }

    const enriched: ChatRoom[] = await Promise.all(
      roomData.map(async (room) => {
        const { data: memberProfiles } = await supabase
          .from('chat_room_members')
          .select('user_id, last_read_at, profiles!chat_room_members_user_id_fkey(id, name, avatar_url, role, department, is_active, user_status, last_seen)')
          .eq('room_id', room.id)

        const members: RoomMember[] = (memberProfiles ?? []).map((m: any) => ({
          ...(m.profiles ?? {}),
          last_read_at: m.last_read_at,
        })).filter((m: RoomMember) => m.id)

        const { data: lastMsgData } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles!chat_messages_sender_id_fkey(id, name, avatar_url, role, department)')
          .eq('room_id', room.id)
          .eq('deleted_for_everyone', false)
          .order('created_at', { ascending: false })
          .limit(1)

        const myLastRead = memberRows.find(r => r.room_id === room.id)?.last_read_at
        let unreadCount = 0
        if (myLastRead) {
          const { count } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('deleted_for_everyone', false)
            .gt('created_at', myLastRead)
            .neq('sender_id', currentUser.id)
          unreadCount = count ?? 0
        }

        return {
          ...room,
          members,
          last_message: (lastMsgData?.[0] as ChatMessage) ?? null,
          unread_count: unreadCount,
        }
      })
    )

    enriched.sort((a, b) => {
      const aTime = a.last_message?.created_at ?? a.id
      const bTime = b.last_message?.created_at ?? b.id
      return bTime.localeCompare(aTime)
    })

    setRooms(enriched)
    setLoading(false)
  }, [currentUser?.id, currentUser?.role])

  // ── fetchMessages ───────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async (roomId: string) => {
    // Snapshot last_read_at BEFORE marking room as read — used for the "New messages" divider
    if (currentUser?.id) {
      const { data: mr } = await supabase
        .from('chat_room_members')
        .select('last_read_at')
        .eq('room_id', roomId)
        .eq('user_id', currentUser.id)
        .single()
      setUnreadThreshold(mr?.last_read_at ?? null)
    }

    const { data } = await supabase
      .from('chat_messages')
      .select(MSG_SELECT)
      .eq('room_id', roomId)
      .eq('deleted_for_everyone', false)
      .order('created_at', { ascending: true })
      .limit(100)

    const raw = (data as ChatMessage[]) ?? []
    setMessages(stitchReplyTo(raw))
    markRoomAsRead(roomId)
  }, [markRoomAsRead, currentUser?.id])

  // ── sendMessage ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (
    roomId: string,
    message: string,
    replyToId?: string,
  ) => {
    if (!currentUser?.id || !message.trim()) return
    setSendingMessage(true)

    const tempId = `temp-${Date.now()}`
    const parentMsg = replyToId ? messages.find(m => m.id === replyToId) : null
    const optimistic: ChatMessage = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUser.id,
      message: message.trim(),
      reply_to_id: replyToId ?? null,
      reactions: {},
      is_deleted: false,
      deleted_for_everyone: false,
      deleted_for_sender: false,
      edited_at: null,
      read_by: [],
      delivered_to: [],
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar_url: currentUser.avatar_url ?? null,
        role: currentUser.role,
        department: currentUser.department,
      },
      reply_to: parentMsg
        ? {
            id: parentMsg.id,
            message: parentMsg.message,
            sender_id: parentMsg.sender_id,
            senderName: parentMsg.sender?.name ?? 'Unknown',
            deleted_for_everyone: parentMsg.deleted_for_everyone,
          }
        : null,
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: currentUser.id,
        message: message.trim(),
        reply_to_id: replyToId ?? null,
      })
      .select(MSG_SELECT)
      .single()

    if (!error && data) {
      const msg = data as ChatMessage
      const stitched = stitchReplyTo([...messages, msg])
      const stitchedMsg = stitched.find(m => m.id === msg.id) ?? msg
      setMessages(prev => prev.map(m => m.id === tempId ? stitchedMsg : m))
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, last_message: msg } : r))
      markRoomAsRead(roomId)
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
    setSendingMessage(false)
  }, [currentUser, messages, markRoomAsRead])

  // ── toggleReaction (optimistic + revert on error) ───────────────────────────

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser?.id) return
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return

    const prev = JSON.parse(JSON.stringify(msg.reactions ?? {})) as Record<string, string[]>
    const current = JSON.parse(JSON.stringify(prev)) as Record<string, string[]>
    const users: string[] = current[emoji] ?? []
    const hasReacted = users.includes(currentUser.id)

    if (hasReacted) {
      current[emoji] = users.filter(id => id !== currentUser.id)
      if (current[emoji].length === 0) delete current[emoji]
    } else {
      current[emoji] = [...users, currentUser.id]
    }

    // Optimistic update
    setMessages(p => p.map(m => m.id === messageId ? { ...m, reactions: current } : m))

    const { error } = await supabase
      .from('chat_messages')
      .update({ reactions: current })
      .eq('id', messageId)

    if (error) {
      // Revert
      setMessages(p => p.map(m => m.id === messageId ? { ...m, reactions: prev } : m))
    }
  }, [currentUser?.id, messages])

  // ── deleteForMe ─────────────────────────────────────────────────────────────

  const deleteForMe = useCallback(async (messageId: string) => {
    if (!currentUser?.id) return
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return

    // Optimistic: remove from local state immediately
    setMessages(prev => prev.filter(m => m.id !== messageId))

    // Persist to DB only for own messages (deleted_for_sender hides it from sender via RLS)
    if (msg.sender_id === currentUser.id) {
      const { error } = await supabase.rpc('chat_delete_for_me', { p_message_id: messageId })
      // Revert on error
      if (error) setMessages(prev => [...prev, msg].sort(
        (a, b) => a.created_at.localeCompare(b.created_at)
      ))
    }
  }, [currentUser?.id, messages])

  // ── deleteForEveryone ───────────────────────────────────────────────────────

  const deleteForEveryone = useCallback(async (messageId: string) => {
    if (!currentUser?.id) return
    const msg = messages.find(m => m.id === messageId)
    if (!msg || msg.sender_id !== currentUser.id) return

    // Optimistic: show deleted placeholder immediately
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, deleted_for_everyone: true, message: 'This message was deleted' }
        : m
    ))

    const { error } = await supabase.rpc('chat_delete_for_everyone', { p_message_id: messageId })

    // Revert on error
    if (error) setMessages(prev => prev.map(m => m.id === messageId ? msg : m))
  }, [currentUser?.id, messages])

  // ── sendTyping ──────────────────────────────────────────────────────────────

  const sendTyping = useCallback(async (roomId: string) => {
    if (!currentUser?.id) return
    await supabase
      .from('chat_typing')
      .upsert({ room_id: roomId, user_id: currentUser.id, updated_at: new Date().toISOString() })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase.from('chat_typing').delete()
        .eq('room_id', roomId).eq('user_id', currentUser.id)
    }, 3000)
  }, [currentUser?.id])

  // ── startDM ─────────────────────────────────────────────────────────────────

  const startDM = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!currentUser?.id) return null

    const { data: myMemberships } = await supabase
      .from('chat_room_members').select('room_id').eq('user_id', currentUser.id)
    const myRoomIds = myMemberships?.map(m => m.room_id) ?? []

    if (myRoomIds.length > 0) {
      const { data: dmRooms } = await supabase
        .from('chat_rooms').select('id').eq('type', 'dm').in('id', myRoomIds)
      for (const room of dmRooms ?? []) {
        const { data: roomMembers } = await supabase
          .from('chat_room_members').select('user_id').eq('room_id', room.id)
        const memberIds = roomMembers?.map(m => m.user_id) ?? []
        if (memberIds.includes(otherUserId) && memberIds.length === 2) {
          setActiveRoomId(room.id)
          return room.id
        }
      }
    }

    const { data: otherUser } = await supabase
      .from('profiles').select('name').eq('id', otherUserId).single()

    const { data: newRoom } = await supabase
      .from('chat_rooms')
      .insert({
        type: 'dm',
        name: `${currentUser.name} & ${otherUser?.name ?? 'User'}`,
        created_by: currentUser.id,
      })
      .select().single()

    if (!newRoom) return null

    await supabase.from('chat_room_members').insert([
      { room_id: newRoom.id, user_id: currentUser.id },
      { room_id: newRoom.id, user_id: otherUserId },
    ])

    await fetchRooms()
    setActiveRoomId(newRoom.id)
    return newRoom.id
  }, [currentUser, fetchRooms])

  // ── addDirectorToRoom ───────────────────────────────────────────────────────

  const addDirectorToRoom = useCallback(async (roomId: string, directorId: string) => {
    await supabase.from('chat_room_members').insert({ room_id: roomId, user_id: directorId })
    await fetchRooms()
  }, [fetchRooms])

  // ── Global notification subscription (all rooms, for toasts + unread counts) ─

  useEffect(() => {
    if (!currentUser?.id) return

    notifChannelRef.current = supabase
      .channel(`chat-notif-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as any
        if (msg.sender_id === currentUserRef.current?.id) return

        // If this room is actively open and visible, the per-room subscription handles it
        if (isOpenRef.current && activeRoomIdRef.current === msg.room_id) return

        // Increment unread count for the relevant room
        setRooms(prev => prev.map(r =>
          r.id === msg.room_id ? { ...r, unread_count: r.unread_count + 1 } : r
        ))

        // Fire an in-app toast notification
        const room = roomsRef.current.find(r => r.id === msg.room_id)
        if (!room) return
        const sender = room.members.find(m => m.id === msg.sender_id)
        const senderName = sender?.name ?? 'Someone'
        const displayName = room.type === 'dm' ? senderName : room.name

        addToastRef.current({
          type: 'info',
          title: `💬 ${displayName}`,
          message: msg.message?.slice(0, 80) ?? 'New message',
        })
      })
      .subscribe()

    return () => { notifChannelRef.current?.unsubscribe() }
  }, [currentUser?.id])

  // ── Real-time subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!activeRoomId || !currentUser?.id) return

    fetchMessages(activeRoomId)

    channelRef.current = supabase
      .channel(`chat-${activeRoomId}-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoomId}`,
      }, async (payload) => {
        if (payload.new.sender_id === currentUser.id) return
        const { data } = await supabase
          .from('chat_messages').select(MSG_SELECT)
          .eq('id', payload.new.id).single()
        if (data) {
          setMessages(prev => {
            if (prev.some(m => m.id === (data as ChatMessage).id)) return prev
            const newMsg = data as ChatMessage
            const stitched = stitchReplyTo([...prev, newMsg])
            return stitched
          })
          markRoomAsRead(activeRoomId)
          setRooms(prev => prev.map(r =>
            r.id === activeRoomId ? { ...r, last_message: data as ChatMessage } : r
          ))
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoomId}`,
      }, (payload) => {
        const updated = payload.new
        if (updated.deleted_for_everyone) {
          setMessages(prev => prev.map(m =>
            m.id === updated.id
              ? { ...m, deleted_for_everyone: true, message: 'This message was deleted', reactions: {} }
              : m
          ))
          return
        }
        // Update reactions, read_by, delivered_to in-place
        setMessages(prev => prev.map(m =>
          m.id === updated.id
            ? {
                ...m,
                reactions: updated.reactions ?? {},
                read_by: updated.read_by ?? [],
                delivered_to: updated.delivered_to ?? [],
              }
            : m
        ))
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_typing',
        filter: `room_id=eq.${activeRoomId}`,
      }, async () => {
        const { data } = await supabase
          .from('chat_typing')
          .select('user_id, profiles!chat_typing_user_id_fkey(name)')
          .eq('room_id', activeRoomId)
          .neq('user_id', currentUser.id)
        setTypingUsers((data ?? []).map((t: any) => t.profiles?.name ?? 'Someone'))
      })
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
      setTypingUsers([])
    }
  }, [activeRoomId, currentUser?.id])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  // ── Context value ───────────────────────────────────────────────────────────

  return (
    <ChatContext.Provider value={{
      rooms, activeRoom, activeRoomId, setActiveRoomId,
      messages, typingUsers, loading, sendingMessage, totalUnread,
      isOpen, openChat, closeChat,
      sendMessage, toggleReaction,
      deleteForMe, deleteForEveryone,
      sendTyping, startDM, addDirectorToRoom,
      fetchRooms, markRoomAsRead, markRead, markDelivered,
      unreadThreshold,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

/** @deprecated use useChat() */
export const useChatContext = useChat
