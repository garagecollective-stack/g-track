import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { playNotificationSound, isSoundEnabled } from '../services/notificationSound'
import { triggerPushNotification } from '../services/pushNotifications'

function urlForNotif(n: { related_type: string | null; related_id: string | null }): string | undefined {
  if (!n.related_id) return '/app/dashboard'
  switch (n.related_type) {
    case 'task':    return `/app/tasks?highlight=${n.related_id}`
    case 'project': return `/app/projects/${n.related_id}`
    case 'issue':   return `/app/issues?open=${n.related_id}`
    default:        return '/app/dashboard'
  }
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'task' | 'project' | 'issue' | 'overdue' | 'general'
  read: boolean
  related_id: string | null
  related_type: 'task' | 'project' | 'issue' | null
  created_at: string
}

export function useNotifications() {
  const { currentUser } = useApp()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<any>(null)

  // Derived — never a useState
  const unreadCount = notifications.filter(n => !n.read).length

  // Fetch all notifications for current user
  const fetchNotifications = async () => {
    if (!currentUser?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error && data) {
      setNotifications(data)
    }
    setLoading(false)
  }

  // Mark single notification as read
  const markOneAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', currentUser?.id)
    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    }
  }

  // Mark ALL notifications as read
  const markAllAsRead = async () => {
    if (!currentUser?.id) return
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .eq('read', false)
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  // Fetch on mount and when user changes — staggered by 1.5s so it doesn't
  // compete with critical queries (tasks, projects, issues) at page load.
  useEffect(() => {
    if (!currentUser?.id) return
    const timer = setTimeout(fetchNotifications, 1500)

    // Real-time: only listen for new notifications (INSERT)
    // Do NOT listen for UPDATE — it causes race conditions
    channelRef.current = supabase
      .channel(`notif-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const notif = payload.new as Notification
          setNotifications(prev => [notif, ...prev])

          const urgent = notif.type === 'issue' || notif.type === 'overdue'

          // Sound — always tries; internal gates (sound-off, DND, audio not unlocked) silence it
          if (isSoundEnabled()) {
            playNotificationSound(urgent ? 'urgent' : 'default')
          }

          // OS-level notification (Windows Action Center / macOS Notification Center)
          // Only fires when tab is hidden or browser unfocused — the in-app toast handles the focused case
          triggerPushNotification(notif.title, notif.message, urlForNotif(notif), {
            tag: `notif-${notif.id}`,
            urgent,
          })
        }
      )
      .subscribe()

    return () => {
      clearTimeout(timer)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentUser?.id])

  return {
    notifications,
    unreadCount,
    loading,
    markOneAsRead,
    markAllAsRead,
    fetchNotifications,
  }
}
