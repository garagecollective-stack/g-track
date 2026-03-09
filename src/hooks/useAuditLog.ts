import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AuditLog } from '../types'

export function useAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchLogs = useCallback(async (page = 1, filters?: {
    action?: string
    userId?: string
    from?: string
    to?: string
  }) => {
    setLoading(true)
    const pageSize = 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('audit_logs')
      .select(`*, performer:profiles!audit_logs_performed_by_fkey(id, name, email)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters?.userId) query = query.eq('performed_by', filters.userId)
    if (filters?.from) query = query.gte('created_at', filters.from)
    if (filters?.to) query = query.lte('created_at', filters.to + 'T23:59:59')

    const { data, count } = await query
    setLogs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [])

  return { logs, loading, total, fetchLogs }
}
