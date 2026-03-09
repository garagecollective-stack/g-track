import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, TaskStatus } from '../types'
import { useApp } from '../context/AppContext'

interface TaskFilters {
  projectId?: string
  department?: string
  assigneeId?: string
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
        .select(`*, assignee:profiles!tasks_assignee_id_fkey(id, name, email, role, department, user_status)`)
        .order('created_at', { ascending: false })

      if (filters?.projectId) query = query.eq('project_id', filters.projectId)
      if (filters?.department) query = query.eq('department', filters.department)
      if (filters?.assigneeId) query = query.eq('assignee_id', filters.assigneeId)

      const { data, error: err } = await query
      if (err) throw err
      setTasks(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [currentUser, filters?.projectId, filters?.department, filters?.assigneeId])

  useEffect(() => {
    fetchTasks()

    const channelName = `tasks-${filters?.projectId || filters?.department || 'all'}`
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks()
      })
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [fetchTasks])

  const createTask = async (data: Partial<Task>) => {
    const { data: inserted, error: err } = await supabase
      .from('tasks')
      .insert({ ...data, created_by_id: currentUser?.id })
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
    }

    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Task created',
      target_type: 'task',
      target_id: inserted.id,
      target_name: inserted.title,
    })

    await fetchTasks()
    return inserted
  }

  const updateTask = async (id: string, data: Partial<Task>) => {
    const { error: err } = await supabase.from('tasks').update(data).eq('id', id)
    if (err) throw err

    if (data.assignee_id && data.assignee_id !== currentUser?.id) {
      await supabase.from('notifications').insert({
        user_id: data.assignee_id,
        message: `You were assigned "${data.title || 'a task'}"`,
        type: 'assignment',
        related_id: id,
        related_type: 'task',
      })
    }

    await fetchTasks()
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
    await fetchTasks()
  }

  const bulkUpdateStatus = async (ids: string[], status: TaskStatus) => {
    const { error: err } = await supabase.from('tasks').update({ status }).in('id', ids)
    if (err) throw err
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t))
  }

  const bulkDelete = async (ids: string[]) => {
    const { error: err } = await supabase.from('tasks').delete().in('id', ids)
    if (err) throw err
    await fetchTasks()
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
    await fetchTasks()
  }

  return {
    tasks, loading, error, fetchTasks,
    createTask, updateTask, updateTaskStatus, deleteTask,
    bulkUpdateStatus, bulkDelete, bulkReassign,
  }
}
