import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, TaskStatus } from '../types'
import { useApp } from '../context/AppContext'

interface TaskFilters {
  projectId?: string
  department?: string
  assigneeId?: string
  /** Extra assignee IDs to OR-include — used by team leads to see cross-department tasks
   *  assigned to their direct reports (Fix #5) */
  assigneeIds?: string[]
}

export function useTasks(filters?: TaskFilters) {
  const { currentUser } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      let query = supabase
        .from('tasks')
        .select(`
          id, title, description,
          project_id, project_name,
          department, priority, status,
          assignee_id, assignee_name,
          due_date,
          created_by_id, created_by_name, created_by_department,
          created_at, is_overdue, overdue_alerted_at,
          assignee:profiles!tasks_assignee_id_fkey(id, name, email, role, department, user_status),
          creator:profiles!tasks_created_by_id_fkey(id, name, avatar_url, department)
        `)
        .order('created_at', { ascending: false })

      if (filters?.projectId) query = query.eq('project_id', filters.projectId)

      // Fix #5: If both department AND assigneeIds are provided, use OR so that team leads
      // can see cross-department tasks assigned to their team members
      if (filters?.department && filters?.assigneeIds && filters.assigneeIds.length > 0) {
        query = query.or(
          `department.eq.${filters.department},assignee_id.in.(${filters.assigneeIds.join(',')})`
        )
      } else if (filters?.department) {
        query = query.eq('department', filters.department)
      }

      if (filters?.assigneeId) query = query.eq('assignee_id', filters.assigneeId)

      const { data, error: err } = await query
      if (err) throw err

      const fetchedTasks = data || []

      // Client-side overdue detection: mark tasks overdue without waiting for nightly cron
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const overdueIds = fetchedTasks
        .filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done' && !t.is_overdue)
        .map(t => t.id)

      if (overdueIds.length > 0) {
        // Fire-and-forget — don't block rendering
        supabase
          .from('tasks')
          .update({ is_overdue: true })
          .in('id', overdueIds)
          .then(() => {})
      }

      setTasks(fetchedTasks)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  // Spread assigneeIds into a stable join string for the dependency array so a new
  // array reference on every render doesn't cause infinite re-fetches (Fix #5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, filters?.projectId, filters?.department, filters?.assigneeId, filters?.assigneeIds?.join(',')])

  useEffect(() => {
    fetchTasks()

    const channelName = `tasks-rt-${currentUser?.id}-${filters?.projectId || filters?.department || 'all'}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        const newTask = payload.new as Task
        setTasks(prev => prev.find(t => t.id === newTask.id) ? prev : [newTask, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
        const updatedTask = payload.new as Task
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        setTasks(prev => prev.filter(t => t.id !== payload.old.id))
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [fetchTasks])

  const createTask = async (data: Partial<Task>) => {
    const { data: inserted, error: err } = await supabase
      .from('tasks')
      .insert({
        ...data,
        created_by_id: currentUser?.id,
        created_by_name: currentUser?.name || null,
        created_by_department: currentUser?.department || null,
      })
      .select()
      .single()
    if (err) throw err

    if (inserted.assignee_id && inserted.assignee_id !== currentUser?.id) {
      await supabase.from('notifications').insert({
        user_id: inserted.assignee_id,
        message: `You were assigned "${inserted.title}"`,
        type: 'assignment',
        related_id: inserted.id,
        related_type: 'task',
      })

      // Cross-dept: notify the assignee's team lead if assigned across departments
      if (currentUser?.department) {
        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('id, name, department')
          .eq('id', inserted.assignee_id)
          .single()

        if (assigneeProfile?.department && assigneeProfile.department !== currentUser.department) {
          const { data: leadProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('department', assigneeProfile.department)
            .eq('role', 'teamLead')
            .eq('is_active', true)
            .limit(1)

          const leadId = leadProfiles?.[0]?.id
          if (leadId && leadId !== currentUser.id) {
            await supabase.from('notifications').insert({
              user_id: leadId,
              message: `${currentUser.name} assigned "${inserted.title}" to ${assigneeProfile.name} (cross-dept from ${currentUser.department})`,
              type: 'assignment',
              related_id: inserted.id,
              related_type: 'task',
            })
          }
        }
      }
    }

    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Task created',
      target_type: 'task',
      target_id: inserted.id,
      target_name: inserted.title,
    })

    // Real-time subscription handles the state update — no manual fetchTasks() needed
    return inserted
  }

  const updateTask = async (id: string, data: Partial<Task>) => {
    const { error: err } = await supabase.from('tasks').update(data).eq('id', id)
    if (err) throw err

    // Optimistic local update — real-time event also syncs state shortly after
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))

    if (data.assignee_id && data.assignee_id !== currentUser?.id) {
      await supabase.from('notifications').insert({
        user_id: data.assignee_id,
        message: `You were assigned "${data.title || 'a task'}"`,
        type: 'assignment',
        related_id: id,
        related_type: 'task',
      })
    }
  }

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    const { error: err } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (err) throw err
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const deleteTask = async (id: string, title?: string) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Task deleted',
      target_type: 'task',
      target_id: id,
      target_name: title,
    })
    // Real-time DELETE event handles state update
  }

  const bulkUpdateStatus = async (ids: string[], status: TaskStatus) => {
    const { error: err } = await supabase.from('tasks').update({ status }).in('id', ids)
    if (err) throw err
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t))
  }

  const bulkDelete = async (ids: string[]) => {
    const { error: err } = await supabase.from('tasks').delete().in('id', ids)
    if (err) throw err
    // Real-time DELETE events handle state update; also apply locally for immediacy
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
  }

  const bulkReassign = async (ids: string[], assigneeId: string, assigneeName?: string) => {
    const { error: err } = await supabase
      .from('tasks')
      .update({ assignee_id: assigneeId, assignee_name: assigneeName })
      .in('id', ids)
    if (err) throw err

    const tasksToReassign = tasks.filter(t => ids.includes(t.id))
    if (assigneeId !== currentUser?.id) {
      for (const task of tasksToReassign) {
        await supabase.from('notifications').insert({
          user_id: assigneeId,
          message: `You were assigned "${task.title}"`,
          type: 'assignment',
          related_id: task.id,
          related_type: 'task',
        })
      }
    }
    // Optimistic local update
    setTasks(prev => prev.map(t => ids.includes(t.id)
      ? { ...t, assignee_id: assigneeId, assignee_name: assigneeName || null }
      : t
    ))
  }

  return {
    tasks, loading, error, fetchTasks,
    createTask, updateTask, updateTaskStatus, deleteTask,
    bulkUpdateStatus, bulkDelete, bulkReassign,
  }
}
