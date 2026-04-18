import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { useChat } from '../../context/ChatContext'
import { useApp } from '../../context/AppContext'
import type { ChatMessage } from '../../context/ChatContext'
import { Avatar } from '../../shared/Avatar'
import { MessageBubble } from './MessageBubble'

interface Props {
  root: ChatMessage | null
  onClose: () => void
}

export function ThreadPanel({ root, onClose }: Props) {
  const { currentUser } = useApp()
  const { messages, sendMessage, sendingMessage, markThreadRead } = useChat()
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Keep a stable copy of the root message (don't blank out when the parent remounts)
  const [stableRoot, setStableRoot] = useState<ChatMessage | null>(root)
  useEffect(() => { if (root) setStableRoot(root) }, [root])

  const replies = useMemo(() => {
    if (!stableRoot) return []
    return messages
      .filter(m => m.thread_root_id === stableRoot.id && !m.deleted_for_everyone)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [messages, stableRoot])

  // Mark thread read on open + whenever new replies arrive while panel is visible
  useEffect(() => {
    if (!root) return
    markThreadRead(root.id).catch(() => {})
  }, [root, replies.length, markThreadRead])

  // Autoscroll on new reply
  useEffect(() => {
    if (!root) return
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [replies.length, root])

  // Focus input when opened
  useEffect(() => {
    if (root) setTimeout(() => inputRef.current?.focus(), 200)
  }, [root])

  const handleSend = useCallback(async () => {
    if (!stableRoot || !input.trim()) return
    const text = input
    setInput('')
    await sendMessage(stableRoot.room_id, text, stableRoot.id, stableRoot.id)
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }, [stableRoot, input, sendMessage])

  const visible = !!root

  return (
    <>
      {/* Backdrop (only on small screens — on larger screens the panel sits beside the drawer) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[55] bg-black/30 backdrop-blur-[1px] md:hidden transition-opacity ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Thread panel */}
      <div
        className={`fixed top-0 right-0 z-[60] h-[100dvh] w-full md:w-[400px] lg:w-[420px] bg-[var(--surface-1)] border-l border-[var(--line-1)] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--line-1)] bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-2)]/30">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={15} strokeWidth={2.2} className="text-[var(--primary)] shrink-0" />
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[var(--ink-900)] leading-tight">Thread</p>
              <p className="text-[10.5px] text-[var(--ink-500)] font-mono tabular-nums">
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] text-[var(--ink-500)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Root + replies */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
          {stableRoot && (
            <>
              {/* Root message, pinned at top with divider */}
              <div className="border-b border-dashed border-[var(--line-1)] py-2 bg-[var(--surface-2)]/10">
                <div className="flex gap-2.5 px-3 pt-2">
                  <Avatar
                    name={stableRoot.sender?.name ?? 'Unknown'}
                    size="sm"
                    imageUrl={stableRoot.sender?.avatar_url ?? null}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className={`text-[13.5px] font-bold leading-none ${
                        stableRoot.sender_id === currentUser?.id ? 'text-[var(--primary)]' : 'text-[var(--ink-900)]'
                      }`}>
                        {stableRoot.sender?.name ?? 'Unknown'}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-[var(--ink-400)]">
                        {format(new Date(stableRoot.created_at), 'h:mm a')}
                      </span>
                    </div>
                    <p className="text-[14px] leading-[1.45] text-[var(--ink-900)] break-words whitespace-pre-wrap">
                      {stableRoot.deleted_for_everyone ? (
                        <span className="italic text-[var(--ink-400)]">🚫 This message was deleted</span>
                      ) : stableRoot.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reply count divider */}
              {replies.length > 0 && (
                <div className="flex items-center gap-2 my-2 px-4">
                  <span className="text-[10.5px] font-bold text-[var(--ink-400)] uppercase tracking-wider shrink-0">
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </span>
                  <div className="flex-1 h-px bg-[var(--line-1)]" />
                </div>
              )}

              {/* Replies */}
              <div className="pb-2">
                {replies.map((msg, i) => {
                  const prev = replies[i - 1]
                  const next = replies[i + 1]
                  const prevSame = prev && prev.sender_id === msg.sender_id &&
                    (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60 * 1000
                  const nextSame = next && next.sender_id === msg.sender_id &&
                    (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime()) < 5 * 60 * 1000
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onReply={() => {}}
                      showAvatar={!nextSame}
                      showSenderName={!prevSame}
                    />
                  )
                })}
              </div>

              {replies.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--line-1)] flex items-center justify-center mb-2">
                    <MessageSquare size={16} className="text-[var(--ink-400)]" strokeWidth={2.2} />
                  </div>
                  <p className="text-[12.5px] font-semibold text-[var(--ink-700)]">No replies yet</p>
                  <p className="text-[11px] text-[var(--ink-500)] mt-0.5">Start the thread by replying below</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Compose */}
        <div className="shrink-0 px-3 pb-3 pt-2 border-t border-[var(--line-1)] bg-[var(--surface-1)]">
          <div className="flex items-end gap-2 bg-[var(--surface-2)]/60 border border-[var(--line-1)] rounded-[var(--r-sm)] focus-within:border-[var(--primary)] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (inputRef.current) {
                  inputRef.current.style.height = 'auto'
                  inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + 'px'
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Reply in thread…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-[13.5px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] py-2 pl-3 focus:outline-none max-h-[160px]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendingMessage}
              className="m-1 p-1.5 rounded-[var(--r-xs)] bg-[var(--primary)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--primary-600)] transition-colors"
            >
              <Send size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
