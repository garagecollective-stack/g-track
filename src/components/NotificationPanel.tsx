import { useEffect, useRef } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { timeAgo } from '../utils/helpers'
import type { NotificationType } from '../types'

function notifDot(type: NotificationType) {
  switch (type) {
    case 'assignment': return 'bg-blue-500'
    case 'completion': return 'bg-green-500'
    default: return 'bg-gray-400'
  }
}

interface Props {
  onClose: () => void
}

export function NotificationPanel({ onClose }: Props) {
  const { notifications, markRead, markAllRead } = useNotifications()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[380px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Notifications</span>
        <button onClick={markAllRead} className="text-xs text-[#0A5540] hover:underline font-medium">
          Mark all read
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">You're all caught up!</div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-[#edf8f4]' : ''}`}
            >
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${notifDot(n.type)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-50">
          No more notifications
        </div>
      )}
    </div>
  )
}
