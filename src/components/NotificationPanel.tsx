import { useState, useRef, useEffect } from 'react'
import { Bell, Check, AlertTriangle, AlertCircle, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import { useApp } from '../context/AppContext'
import { formatDistanceToNow } from 'date-fns'

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const { notifications, unreadCount, markOneAsRead, markAllAsRead } = useNotifications()

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotificationClick = (notification: ReturnType<typeof useNotifications>['notifications'][number]) => {
    markOneAsRead(notification.id)
    setOpen(false)
    if (!notification.related_type || !notification.related_id) return
    switch (notification.related_type) {
      case 'project':
        navigate(`/app/projects/${notification.related_id}`)
        break
      case 'task':
        navigate(`/app/tasks?highlight=${notification.related_id}`)
        break
      case 'issue':
        if (currentUser?.role === 'member') {
          navigate(`/app/dashboard?issue=${notification.related_id}`)
        } else {
          navigate(`/app/issues?open=${notification.related_id}`)
        }
        break
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'issue':   return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'project': return <FolderOpen className="w-4 h-4 text-blue-500" />
      default:        return <Check className="w-4 h-4 text-[#0A5540]" />
    }
  }

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'issue':   return 'border-l-red-500'
      case 'overdue': return 'border-l-amber-500'
      case 'project': return 'border-l-blue-500'
      default:        return 'border-l-[#0A5540]'
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAsRead()
                }}
                className="text-sm text-[#0A5540] font-medium hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    flex gap-3 px-4 py-3 cursor-pointer border-l-2 transition-colors
                    ${getBorderColor(notification.type)}
                    ${notification.read
                      ? 'bg-white hover:bg-gray-50 opacity-60'
                      : 'bg-[#f9fffe] hover:bg-[#edf8f4]'
                    }
                  `}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${notification.read ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-[#0A5540] mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">
              {notifications.length === 0 ? 'All caught up!' : `${notifications.length} notifications`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
