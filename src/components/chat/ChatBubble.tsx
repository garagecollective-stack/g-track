import { MessageCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useChat } from '../../context/ChatContext'

export function ChatBubble() {
  const { currentUser } = useApp()
  const { openChat, totalUnread } = useChat()

  if (currentUser?.role === 'director') return null

  return (
    <button
      onClick={() => openChat()}
      aria-label="Open chat"
      className="fixed right-4 md:right-6 z-30 w-12 h-12 bg-[var(--primary)] dark:bg-[#16a273] text-white dark:text-black rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-150 chat-fab"
    >
      {/* Pulsing outer ring when there are unread messages */}
      {totalUnread > 0 && (
        <span className="absolute inset-0 rounded-full bg-[var(--primary)] dark:bg-[#16a273] animate-ping opacity-40" />
      )}
      <MessageCircle size={20} />
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </button>
  )
}
