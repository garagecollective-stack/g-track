import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types'
import { useApp } from '../context/AppContext'

export function useNotifications() {
  const { currentUser, addToast } = useApp()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
  }, [currentUser])

  useEffect(() => {
    fetchNotifications()

    if (!currentUser) return

    channelRef.current = supabase
      .channel('my-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        const notif = payload.new as Notification
        setNotifications(prev => [notif, ...prev])
        addToast({ type: 'info', title: notif.message })
      })
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [currentUser, fetchNotifications, addToast])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    if (!currentUser) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead }
}
