import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { OverdueAlert } from '../types'
import { useApp } from '../context/AppContext'

export function useOverdueAlerts() {
  const { currentUser } = useApp()
  const [alerts, setAlerts] = useState<OverdueAlert[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchAlerts = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('overdue_alerts')
        .select('*')
        .eq('alerted_to', currentUser.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      setAlerts(data || [])
    } catch {
      // silently fail — overdue alerts are non-critical
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchAlerts()

    channelRef.current = supabase
      .channel(`overdue-alerts-${currentUser?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'overdue_alerts',
          filter: `alerted_to=eq.${currentUser?.id}`,
        },
        () => fetchAlerts()
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [fetchAlerts, currentUser?.id])

  const dismissAlert = async (id: string) => {
    await supabase
      .from('overdue_alerts')
      .update({ is_dismissed: true })
      .eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const dismissAll = async () => {
    if (!currentUser) return
    await supabase
      .from('overdue_alerts')
      .update({ is_dismissed: true })
      .eq('alerted_to', currentUser.id)
    setAlerts([])
  }

  return {
    alerts,
    count: alerts.length,
    loading,
    dismissAlert,
    dismissAll,
  }
}
