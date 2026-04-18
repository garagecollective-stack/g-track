import { useState, useRef, useEffect } from 'react'
import { Bell, BellRing, Check, AlertTriangle, AlertCircle, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import { useApp } from '../context/AppContext'
import { formatDistanceToNow } from 'date-fns'
import { requestNotificationPermission } from '../services/pushNotifications'

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [permState, setPermState] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  )
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const { notifications, unreadCount, markOneAsRead, markAllAsRead } = useNotifications()

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission()
    setPermState(granted ? 'granted' : (typeof Notification !== 'undefined' ? Notification.permission : 'denied'))
    if (granted) {
      new Notification('Notifications enabled', {
        body: "You'll hear new updates even when G-Track is in the background.",
        icon: '/logo.png',
      })
    }
  }

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
      default:        return <Check className="w-4 h-4 text-[var(--primary)]" />
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
        className="relative p-2 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <Bell className="w-5 h-5 text-[var(--ink-700)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-[var(--surface-1)] dark:bg-[#0D0D0D] rounded-2xl shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.8)] border border-[var(--line-1)] dark:border-[#1F2937] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line-1)] dark:border-[#1F2937]">
            <span className="font-semibold text-[var(--ink-900)] dark:text-[var(--ink-900)]">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAsRead()
                }}
                className="text-sm text-[var(--primary)] dark:text-[#16a273] font-medium hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Permission prompt */}
          {permState === 'default' && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="w-full flex items-start gap-2.5 px-4 py-3 bg-[var(--primary-50)] dark:bg-[var(--primary)]/10 border-b border-[var(--line-1)] dark:border-[#1F2937] text-left hover:bg-[var(--primary-100)] dark:hover:bg-[var(--primary)]/20 transition-colors"
            >
              <BellRing size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[var(--ink-900)]">Enable desktop alerts</p>
                <p className="text-[11px] text-[var(--ink-500)] mt-0.5">Get a system notification when you're on another tab</p>
              </div>
            </button>
          )}
          {permState === 'denied' && (
            <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-[var(--line-1)] text-[11px] text-amber-700 dark:text-amber-300">
              Desktop alerts are blocked. Re-enable them in your browser's site settings (click the padlock next to the URL).
            </div>
          )}

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--ink-400)] dark:text-[#6B7280]">
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
                      ? 'bg-[var(--surface-1)] dark:bg-[#0D0D0D] hover:bg-[var(--surface-2)] dark:hover:bg-[#141414] opacity-60'
                      : 'bg-[#f9fffe] dark:bg-[var(--primary)]/10 hover:bg-[var(--primary-50)] dark:hover:bg-[var(--primary)]/20'
                    }
                  `}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${notification.read ? 'text-[var(--ink-500)] dark:text-[#6B7280]' : 'text-[var(--ink-900)] dark:text-[var(--ink-900)] font-medium'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-[var(--ink-400)] dark:text-[#4B5563] mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-[#16a273] dark:bg-[#16a273] mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--line-1)] dark:border-[#1F2937] text-center">
            <span className="text-xs text-[var(--ink-400)] dark:text-[#6B7280]">
              {notifications.length === 0 ? 'All caught up!' : `${notifications.length} notifications`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
