import { useState, useRef, useEffect } from 'react'
import { Reply, Smile, MoreVertical, Check, CheckCheck, Pin, PinOff, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { Avatar } from '../../shared/Avatar'
import { useChat } from '../../context/ChatContext'
import { useApp } from '../../context/AppContext'
import type { ChatMessage } from '../../context/ChatContext'
import { LinkUnfurls } from './LinkUnfurl'

const ALL_EMOJIS = ['👍', '❤️', '😂', '🔥']

interface Props {
  message: ChatMessage
  onReply: (message: ChatMessage) => void
  onOpenThread?: (message: ChatMessage) => void
  threadReplyCount?: number
  threadUnread?: number
  showAvatar: boolean
  showSenderName: boolean
  isUnread?: boolean
}

export function MessageBubble({ message, onReply, onOpenThread, threadReplyCount = 0, threadUnread = 0, showAvatar, showSenderName, isUnread }: Props) {
  const { currentUser } = useApp()
  const { toggleReaction, deleteForMe, deleteForEveryone, togglePin } = useChat()

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const emojiRef = useRef<HTMLDivElement>(null)
  const deleteRef = useRef<HTMLDivElement>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOwn = message.sender_id === currentUser?.id
  const senderName = message.sender?.name ?? 'Unknown'
  const time = format(new Date(message.created_at), 'h:mm a')
  const shortTime = format(new Date(message.created_at), 'HH:mm')
  const reactions = Object.entries(message.reactions ?? {})
  const isDeleted = message.deleted_for_everyone

  const readCount = (message.read_by ?? []).filter(id => id !== currentUser?.id).length
  const deliveredCount = (message.delivered_to ?? []).filter(id => id !== currentUser?.id).length

  useEffect(() => {
    if (!showEmojiPicker && !showDeleteMenu) return
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false)
      if (deleteRef.current && !deleteRef.current.contains(e.target as Node)) setShowDeleteMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker, showDeleteMenu])

  const handleTouchStart = () => { longPressRef.current = setTimeout(() => setShowDeleteMenu(true), 500) }
  const handleTouchEnd = () => { if (longPressRef.current) clearTimeout(longPressRef.current) }
  const handleReact = (emoji: string) => { toggleReaction(message.id, emoji); setShowEmojiPicker(false) }
  const handleDeleteForMe = () => { deleteForMe(message.id); setShowDeleteMenu(false) }
  const handleDeleteForEveryone = () => { deleteForEveryone(message.id); setShowDeleteMenu(false) }

  const actionBtn = 'p-1.5 rounded-[var(--r-xs)] text-[var(--ink-500)] hover:text-[var(--ink-900)] hover:bg-[var(--surface-2)] transition-colors'

  // Slack-style: avatar column fixed at left for group heads; follow-up messages show hover-timestamp in that column
  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex gap-2.5 px-3 ${showSenderName ? 'pt-2 mt-0.5' : 'py-[1px]'} hover:bg-[var(--surface-1)] dark:hover:bg-white/[0.02] transition-colors scroll-mt-20 ${
        isUnread ? 'border-l-2 border-[var(--primary)] -ml-[2px] pl-[calc(0.75rem-2px)]' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Left column: avatar on new group, hover-time on follow-up ── */}
      <div className="w-9 shrink-0 flex justify-center">
        {showSenderName ? (
          <Avatar name={senderName} size="sm" imageUrl={message.sender?.avatar_url ?? null} />
        ) : (
          <span className="hidden group-hover:block text-[10px] font-mono tabular-nums text-[var(--ink-400)] pt-[3px] leading-none">
            {shortTime}
          </span>
        )}
      </div>

      {/* ── Right column: name + body + reactions ── */}
      <div className="flex-1 min-w-0">
        {showSenderName && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`text-[13.5px] font-bold leading-none ${isOwn ? 'text-[var(--primary)]' : 'text-[var(--ink-900)]'}`}>
              {senderName}{isOwn && <span className="text-[10px] font-medium text-[var(--ink-400)] ml-1">you</span>}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[var(--ink-400)]">
              {time}
            </span>
          </div>
        )}

        {/* Reply quote */}
        {!isDeleted && message.reply_to && (
          <div className="mb-1 flex items-stretch gap-2 text-[12.5px]">
            <div className="w-0.5 bg-[var(--line-2)] rounded-full shrink-0" />
            <div className="min-w-0 flex-1 py-0.5">
              <p className="font-semibold text-[var(--ink-700)] truncate leading-tight">
                {message.reply_to.deleted_for_everyone ? 'Deleted message' : `↳ ${message.reply_to.senderName}`}
              </p>
              {!message.reply_to.deleted_for_everyone && (
                <p className="text-[var(--ink-500)] truncate leading-tight">
                  {message.reply_to.message.slice(0, 80)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Message body */}
        {isDeleted ? (
          <p className="italic text-[13px] text-[var(--ink-400)] flex items-center gap-1.5">
            <span>🚫</span> This message was deleted
          </p>
        ) : (
          <>
            {message.is_pinned && (
              <span className="inline-flex items-center gap-1 mb-1 text-[10px] font-semibold text-[var(--primary)] bg-[var(--primary-50)] px-1.5 py-0.5 rounded-full ring-1 ring-inset ring-[var(--primary)]/20 uppercase tracking-wide">
                <Pin size={9} strokeWidth={2.4} /> Pinned
              </span>
            )}
            <p className="text-[14px] leading-[1.45] text-[var(--ink-900)] break-words whitespace-pre-wrap">
              {message.message}
            </p>
            <LinkUnfurls text={message.message} />
          </>
        )}

        {/* Read ticks for own messages */}
        {isOwn && !isDeleted && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--ink-400)]">
            {readCount > 0
              ? <><CheckCheck size={11} className="text-[var(--primary)]" /><span className="font-mono tabular-nums">Read</span></>
              : deliveredCount > 0
              ? <><CheckCheck size={11} /><span className="font-mono tabular-nums">Delivered</span></>
              : <><Check size={11} /><span className="font-mono tabular-nums">Sent</span></>
            }
          </div>
        )}

        {/* Thread reply summary */}
        {!isDeleted && threadReplyCount > 0 && onOpenThread && (
          <button
            onClick={() => onOpenThread(message)}
            className={`group/thread mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-semibold transition-colors ${
              threadUnread > 0
                ? 'bg-[var(--primary-50)] text-[var(--primary)] ring-1 ring-inset ring-[var(--primary)]/30 hover:ring-[var(--primary)]/60'
                : 'text-[var(--ink-500)] hover:text-[var(--primary)] hover:bg-[var(--primary-50)]'
            }`}
          >
            <MessageSquare size={11} strokeWidth={2.2} />
            <span className="font-mono tabular-nums">{threadReplyCount}</span>
            <span>{threadReplyCount === 1 ? 'reply' : 'replies'}</span>
            {threadUnread > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-[var(--primary)] text-white text-[9px] font-bold leading-none">
                {threadUnread > 9 ? '9+' : threadUnread}
              </span>
            )}
            <span className="text-[10.5px] font-normal text-[var(--ink-400)] group-hover/thread:text-[var(--primary)]">· View thread</span>
          </button>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reactions.map(([emoji, users]) => {
              const isMine = users.includes(currentUser?.id ?? '')
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  title={users.join(', ')}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[12px] font-medium transition-colors ${
                    isMine
                      ? 'bg-[var(--primary-50)] text-[var(--primary)] ring-1 ring-inset ring-[var(--primary)]/30'
                      : 'bg-[var(--surface-2)] text-[var(--ink-700)] ring-1 ring-inset ring-[var(--line-1)] hover:ring-[var(--line-2)]'
                  }`}
                >
                  <span className="text-[13px] leading-none">{emoji}</span>
                  <span className="font-mono tabular-nums">{users.length}</span>
                </button>
              )
            })}
            <button
              onClick={() => setShowEmojiPicker(true)}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--surface-2)] text-[var(--ink-400)] ring-1 ring-inset ring-[var(--line-1)] hover:ring-[var(--line-2)] hover:text-[var(--ink-700)] opacity-0 group-hover:opacity-100 transition-opacity"
              title="Add reaction"
            >
              <Smile size={11} />
            </button>
          </div>
        )}
      </div>

      {/* ── Floating action toolbar (Slack-style, top-right of row) ── */}
      {!isDeleted && (
        <div className="hidden group-hover:flex absolute -top-3 right-3 z-10 items-center bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-sm)] shadow-md overflow-visible">
          <div className="relative" ref={emojiRef}>
            <button onClick={() => setShowEmojiPicker(p => !p)} title="React" className={actionBtn}>
              <Smile size={14} />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-1.5 right-0 z-50 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] shadow-xl p-1.5 flex gap-0.5">
                {ALL_EMOJIS.map(emoji => {
                  const alreadyReacted = (message.reactions?.[emoji] ?? []).includes(currentUser?.id ?? '')
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className={`w-8 h-8 flex items-center justify-center text-base rounded-[var(--r-sm)] transition-colors ${
                        alreadyReacted
                          ? 'bg-[var(--primary-50)] ring-1 ring-inset ring-[var(--primary)]/30'
                          : 'hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {onOpenThread && (
            <button onClick={() => onOpenThread(message)} title="Reply in thread" className={actionBtn}>
              <MessageSquare size={14} />
            </button>
          )}
          <button onClick={() => onReply(message)} title="Quote reply" className={actionBtn}>
            <Reply size={14} />
          </button>
          <button
            onClick={() => togglePin(message.id)}
            title={message.is_pinned ? 'Unpin message' : 'Pin to channel'}
            className={`${actionBtn} ${message.is_pinned ? 'text-[var(--primary)]' : ''}`}
          >
            {message.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <div className="relative" ref={deleteRef}>
            <button onClick={() => setShowDeleteMenu(p => !p)} title="More" className={actionBtn}>
              <MoreVertical size={14} />
            </button>
            {showDeleteMenu && (
              <div className="absolute bottom-full mb-1 right-0 z-50 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-sm)] shadow-xl py-1 min-w-[170px]">
                <button
                  onClick={handleDeleteForMe}
                  className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--ink-700)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  Delete for me
                </button>
                {isOwn && (
                  <button
                    onClick={handleDeleteForEveryone}
                    className="w-full text-left px-3 py-1.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Delete for everyone
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
