import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

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

  // Fetch on mount and when user changes
  useEffect(() => {
    if (!currentUser?.id) return
    fetchNotifications()

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
          setNotifications(prev => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
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
