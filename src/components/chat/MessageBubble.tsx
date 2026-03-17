import { useState, useRef, useEffect } from 'react'
import { Reply, Smile, MoreVertical, Check, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { Avatar } from '../../shared/Avatar'
import { useChat } from '../../context/ChatContext'
import { useApp } from '../../context/AppContext'
import type { ChatMessage } from '../../context/ChatContext'

const ALL_EMOJIS = ['👍', '❤️', '😂', '🔥']

interface Props {
  message: ChatMessage
  onReply: (message: ChatMessage) => void
  showAvatar: boolean
  showSenderName: boolean
  isUnread?: boolean
}

export function MessageBubble({ message, onReply, showAvatar, showSenderName, isUnread }: Props) {
  const { currentUser } = useApp()
  const { toggleReaction, deleteForMe, deleteForEveryone } = useChat()

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const emojiRef  = useRef<HTMLDivElement>(null)
  const deleteRef = useRef<HTMLDivElement>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOwn      = message.sender_id === currentUser?.id
  const senderName = message.sender?.name ?? 'Unknown'
  const time       = format(new Date(message.created_at), 'HH:mm')
  const reactions  = Object.entries(message.reactions ?? {})
  const isDeleted  = message.deleted_for_everyone

  const readCount      = (message.read_by ?? []).filter(id => id !== currentUser?.id).length
  const deliveredCount = (message.delivered_to ?? []).filter(id => id !== currentUser?.id).length

  useEffect(() => {
    if (!showEmojiPicker && !showDeleteMenu) return
    const handler = (e: MouseEvent) => {
      if (emojiRef.current  && !emojiRef.current.contains(e.target as Node))  setShowEmojiPicker(false)
      if (deleteRef.current && !deleteRef.current.contains(e.target as Node)) setShowDeleteMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker, showDeleteMenu])

  const handleTouchStart = () => { longPressRef.current = setTimeout(() => setShowDeleteMenu(true), 500) }
  const handleTouchEnd   = () => { if (longPressRef.current) clearTimeout(longPressRef.current) }
  const handleReact      = (emoji: string) => { toggleReaction(message.id, emoji); setShowEmojiPicker(false) }
  const handleDeleteForMe       = () => { deleteForMe(message.id);       setShowDeleteMenu(false) }
  const handleDeleteForEveryone = () => { deleteForEveryone(message.id); setShowDeleteMenu(false) }

  const actionBtn = 'p-1 rounded-lg bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] text-gray-400 dark:text-[#6B7280] hover:text-gray-700 dark:hover:text-[#B3B3B3] shadow-sm transition-colors'

  return (
    <div
      className={`group flex gap-1.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end mb-0.5`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Unread dot column (received messages only, fixed width so layout never shifts) ── */}
      {!isOwn && (
        <div className="w-2 shrink-0 flex items-center justify-center self-center">
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-[#0A5540] dark:bg-[#22C55E] shrink-0" />
          )}
        </div>
      )}

      {/* ── Avatar ── */}
      <div className="w-7 shrink-0">
        {showAvatar && !isOwn && (
          <Avatar name={senderName} size="xs" imageUrl={message.sender?.avatar_url ?? null} />
        )}
      </div>

      {/* ── Column: sender name + bubble + reactions ── */}
      <div className={`flex flex-col gap-0.5 max-w-[68%] ${isOwn ? 'items-end' : 'items-start'}`}>

        {showSenderName && !isOwn && (
          <span className="text-[11px] font-medium text-gray-500 dark:text-[#6B7280] px-1">{senderName}</span>
        )}

        {/* Action bar + bubble */}
        <div className={`relative flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>

          {!isDeleted && (
            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">

              {/* Reply */}
              <button onClick={() => onReply(message)} title="Reply" className={actionBtn}>
                <Reply size={12} />
              </button>

              {/* Emoji picker */}
              <div className="relative" ref={emojiRef}>
                <button onClick={() => setShowEmojiPicker(p => !p)} title="React" className={actionBtn}>
                  <Smile size={12} />
                </button>
                {showEmojiPicker && (
                  <div className={`absolute bottom-full mb-1.5 z-50 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#1F2937] rounded-2xl shadow-xl p-2 ${isOwn ? 'right-0' : 'left-0'}`}>
                    <div className="flex gap-1">
                      {ALL_EMOJIS.map(emoji => {
                        const alreadyReacted = (message.reactions?.[emoji] ?? []).includes(currentUser?.id ?? '')
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReact(emoji)}
                            className={`w-9 h-9 flex items-center justify-center text-lg rounded-xl transition-colors ${
                              alreadyReacted
                                ? 'bg-[#0A5540] dark:bg-[#22C55E] ring-1 ring-[#0A5540] dark:ring-[#22C55E]'
                                : 'hover:bg-gray-100 dark:hover:bg-[#1F2937]'
                            }`}
                          >
                            {emoji}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Delete menu */}
              <div className="relative" ref={deleteRef}>
                <button onClick={() => setShowDeleteMenu(p => !p)} title="More" className={actionBtn}>
                  <MoreVertical size={12} />
                </button>
                {showDeleteMenu && (
                  <div className={`absolute bottom-full mb-1 z-50 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#1F2937] rounded-xl shadow-xl py-1 min-w-[160px] ${isOwn ? 'right-0' : 'left-0'}`}>
                    <button
                      onClick={handleDeleteForMe}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-[#B3B3B3] hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors"
                    >
                      Delete for me
                    </button>
                    {isOwn && (
                      <button
                        onClick={handleDeleteForEveryone}
                        className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        Delete for everyone
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bubble */}
          <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
            isDeleted
              ? 'bg-gray-100 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151]'
              : isOwn
              ? 'bg-[#0A5540] text-white rounded-tr-sm'
              : 'bg-white dark:bg-[#1F2937] border border-gray-100 dark:border-[#374151] text-gray-900 dark:text-[#E5E7EB] rounded-tl-sm'
          }`}>
            {isDeleted ? (
              <p className="italic text-gray-400 dark:text-[#6B7280] text-xs flex items-center gap-1">
                <span>🚫</span> This message was deleted
              </p>
            ) : (
              <>
                {message.reply_to && (
                  <div className={`mb-1.5 rounded-lg px-2 py-1 text-xs border-l-2 ${
                    isOwn
                      ? 'bg-white/10 border-white/30'
                      : 'bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-[#4B5563]'
                  }`}>
                    <p className={`font-semibold truncate ${isOwn ? 'text-white/80' : 'text-gray-600 dark:text-[#B3B3B3]'}`}>
                      {message.reply_to.deleted_for_everyone ? '🚫 Deleted message' : message.reply_to.senderName}
                    </p>
                    {!message.reply_to.deleted_for_everyone && (
                      <p className={`truncate ${isOwn ? 'text-white/60' : 'text-gray-500 dark:text-[#6B7280]'}`}>
                        {message.reply_to.message.slice(0, 60)}
                      </p>
                    )}
                  </div>
                )}
                <p className="break-words whitespace-pre-wrap">{message.message}</p>
              </>
            )}

            {/* Time + delivery ticks */}
            <div className="flex items-center justify-end gap-0.5 mt-0.5 -mb-0.5 -mr-0.5">
              <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-gray-400 dark:text-[#6B7280]'}`}>
                {time}
              </span>
              {isOwn && !isDeleted && (
                readCount > 0
                  ? <CheckCheck size={12} className="text-[#22C55E]" />
                  : deliveredCount > 0
                  ? <CheckCheck size={12} className="text-white/50" />
                  : <Check size={12} className="text-white/50" />
              )}
            </div>
          </div>
        </div>

        {/* ── Reaction buttons — styled like action buttons (rounded-lg, bordered) ── */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {reactions.map(([emoji, users]) => {
              const isMine = users.includes(currentUser?.id ?? '')
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  title={users.join(', ')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border shadow-sm transition-colors ${
                    isMine
                      ? 'bg-[#0A5540] dark:bg-[#22C55E] border-[#0A5540] dark:border-[#22C55E] text-white dark:text-black'
                      : 'bg-white dark:bg-[#1F2937] border-gray-200 dark:border-[#374151] text-gray-700 dark:text-[#B3B3B3] hover:bg-gray-50 dark:hover:bg-[#374151]'
                  }`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  <span>{users.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
