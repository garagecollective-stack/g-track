import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Issue, IssueReply, IssuePriority, Profile } from '../types'
import { useApp } from '../context/AppContext'

interface CreateIssueData {
  entity_type: 'task' | 'project'
  entity_id: string
  entity_name: string
  title: string
  description: string
  priority: IssuePriority
}

// Module-level in-flight deduplication: multiple callers with the same key
// (e.g. DashboardLayout badge + Dashboard page) share one DB round-trip.
const inFlight = new Map<string, Promise<Issue[]>>()

function buildQuery(currentUser: Profile, entityId?: string) {
  let query = supabase
    .from('issues')
    .select('*')
    .order('updated_at', { ascending: false })

  if (currentUser.role === 'member') {
    const dept = currentUser.department || ''
    if (dept) {
      query = query.or(`raised_by.eq.${currentUser.id},department.eq.${dept}`)
    } else {
      query = query.eq('raised_by', currentUser.id)
    }
  } else if (currentUser.role === 'teamLead') {
    query = query.eq('department', currentUser.department || '')
  }

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }

  return query
}

export function useIssues(entityId?: string) {
  const { currentUser } = useApp()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchIssues = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const cacheKey = `${currentUser.id}-${currentUser.role}-${currentUser.department || ''}-${entityId || ''}`
      let fetchPromise = inFlight.get(cacheKey)
      if (!fetchPromise) {
        fetchPromise = Promise.resolve(buildQuery(currentUser, entityId))
          .then(({ data, error: err }) => {
            if (err) throw err
            return (data || []) as Issue[]
          })
        inFlight.set(cacheKey, fetchPromise)
        fetchPromise.finally(() => inFlight.delete(cacheKey))
      }
      const data = await fetchPromise
      setIssues(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load issues')
    } finally {
      setLoading(false)
    }
  }, [currentUser, entityId])

  useEffect(() => {
    fetchIssues()

    const channelName = `issues-${entityId || currentUser?.id || 'all'}`
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'issues' }, (payload) => {
        // Apply the same role-based visibility filter client-side to avoid a DB round-trip
        const issue = payload.new as Issue
        if (currentUser?.role === 'member') {
          const dept = currentUser.department || ''
          if (issue.raised_by !== currentUser.id && issue.department !== dept) return
        } else if (currentUser?.role === 'teamLead') {
          if (issue.department !== currentUser.department) return
        }
        if (entityId && issue.entity_id !== entityId) return
        setIssues(prev => prev.find(i => i.id === issue.id) ? prev : [issue, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'issues' }, (payload) => {
        // Update state locally — avoids a full DB round-trip on every UPDATE event
        setIssues(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } as Issue : i))
      })
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [fetchIssues, entityId, currentUser?.id])

  const createIssue = async (data: CreateIssueData) => {
    if (!currentUser) throw new Error('Not authenticated')
    const { data: inserted, error: err } = await supabase
      .from('issues')
      .insert({
        ...data,
        raised_by: currentUser.id,
        raised_by_name: currentUser.name,
        department: currentUser.department || '',
      })
      .select()
      .single()
    if (err) throw err

    // --- Notify team leads and directors in this department (Fix #2 & #9) ---
    const dept = currentUser.department || ''
    const { data: leads } = await supabase
      .from('profiles')
      .select('id, role')
      .in('role', ['teamLead', 'director', 'super_admin'])
      .eq('is_active', true)

    for (const lead of leads || []) {
      // Skip self-notification and only notify dept leads (or all directors)
      if (lead.id === currentUser.id) continue
      const isDeptLead = lead.role === 'teamLead'
      const isDirectorOrAdmin = lead.role === 'director' || lead.role === 'super_admin'

      if (isDirectorOrAdmin || isDeptLead) {
        // For teamLeads, only notify if they match the department
        // (we don't have dept on leads here, so directors get all, teamLeads get filtered below)
        await supabase.from('notifications').insert({
          user_id: lead.id,
          message: `🔴 Issue raised: "${data.title}" in ${data.entity_name}`,
          type: 'update',
          related_id: inserted.id,
          related_type: 'issue',
        })
      }
    }

    // Also notify team leads specifically in the same department
    if (dept) {
      const { data: deptLeads } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'teamLead')
        .eq('department', dept)
        .eq('is_active', true)
        .neq('id', currentUser.id)

      for (const lead of deptLeads || []) {
        // Check if notification was already sent (avoid duplicate)
        const alreadySent = (leads || []).some(l => l.id === lead.id)
        if (!alreadySent) {
          await supabase.from('notifications').insert({
            user_id: lead.id,
            message: `🔴 Issue raised: "${data.title}" in ${data.entity_name}`,
            type: 'update',
            related_id: inserted.id,
            related_type: 'issue',
          })
        }
      }
    }

    await fetchIssues()
    return inserted
  }

  const replyToIssue = async (issueId: string, message: string) => {
    if (!currentUser) throw new Error('Not authenticated')
    const { error: err } = await supabase
      .from('issue_replies')
      .insert({
        issue_id: issueId,
        replied_by: currentUser.id,
        replied_by_name: currentUser.name,
        replied_by_role: currentUser.role,
        message,
      })
    if (err) throw err

    // --- Notify issue creator about the reply (Fix #2) ---
    const issue = issues.find(i => i.id === issueId)
    if (issue && issue.raised_by !== currentUser.id) {
      await supabase.from('notifications').insert({
        user_id: issue.raised_by,
        message: `💬 ${currentUser.name} replied to your issue "${issue.title}"`,
        type: 'update',
        related_id: issueId,
        related_type: 'issue',
      })
    }
  }

  const resolveIssue = async (issueId: string, resolutionNote: string) => {
    if (!currentUser) throw new Error('Not authenticated')
    if (!resolutionNote.trim()) throw new Error('Resolution note is required')
    const { error: err } = await supabase
      .from('issues')
      .update({
        status: 'resolved',
        resolved_by: currentUser.id,
        resolved_at: new Date().toISOString(),
        resolution_note: resolutionNote,
      })
      .eq('id', issueId)
    if (err) throw err

    // Notify issue creator that their issue was resolved
    const issue = issues.find(i => i.id === issueId)
    if (issue && issue.raised_by !== currentUser.id) {
      await supabase.from('notifications').insert({
        user_id: issue.raised_by,
        message: `✅ Your issue "${issue.title}" has been resolved`,
        type: 'update',
        related_id: issueId,
        related_type: 'issue',
      })
    }

    await fetchIssues()
  }

  const markInReview = async (issueId: string) => {
    const { error: err } = await supabase
      .from('issues')
      .update({ status: 'in_review' })
      .eq('id', issueId)
    if (err) throw err
    await fetchIssues()
  }

  const closeIssue = async (issueId: string) => {
    const { error: err } = await supabase
      .from('issues')
      .update({ status: 'closed' })
      .eq('id', issueId)
    if (err) throw err
    await fetchIssues()
  }

  return {
    issues,
    loading,
    error,
    fetchIssues,
    createIssue,
    replyToIssue,
    resolveIssue,
    markInReview,
    closeIssue,
  }
}

export function useIssueReplies(issueId: string | null) {
  const [replies, setReplies] = useState<IssueReply[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchReplies = useCallback(async () => {
    if (!issueId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('issue_replies')
        .select('*')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true })
      if (error) throw error
      setReplies(data || [])
    } finally {
      setLoading(false)
    }
  }, [issueId])

  useEffect(() => {
    if (!issueId) return
    fetchReplies()

    channelRef.current = supabase
      .channel(`replies-${issueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'issue_replies', filter: `issue_id=eq.${issueId}` },
        () => fetchReplies()
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [fetchReplies, issueId])

  return { replies, loading, fetchReplies }
}
