import { useCallback, useMemo } from 'react'
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
  const {
    currentUser,
    tasks: allTasks,
    setTasks,
    tasksLoading: loading,
    tasksError: error,
    fetchTasks,
  } = useApp()

  // Apply filters client-side — AppContext holds all tasks (RLS enforces visibility)
  // Spread assigneeIds into a stable join string for the dependency array so a new
  // array reference on every render doesn't cause unnecessary recomputation (Fix #5)
  const tasks = useMemo(() => {
    let result = allTasks

    if (filters?.projectId) {
      result = result.filter(t => t.project_id === filters.projectId)
    }

    if (filters?.department && filters?.assigneeIds && filters.assigneeIds.length > 0) {
      // Fix #5: team leads see own-dept tasks AND cross-dept tasks assigned to their reports
      result = result.filter(t =>
        t.department === filters.department ||
        filters.assigneeIds!.includes(t.assignee_id!)
      )
    } else if (filters?.department) {
      result = result.filter(t => t.department === filters.department)
    }

    if (filters?.assigneeId) {
      result = result.filter(t => t.assignee_id === filters.assigneeId)
    }

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, filters?.projectId, filters?.department, filters?.assigneeId, filters?.assigneeIds?.join(',')])

  const createTask = useCallback(async (data: Partial<Task>) => {
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

    // Real-time subscription in AppContext handles the state update
    return inserted
  }, [currentUser])

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
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
  }, [currentUser, setTasks])

  const updateTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    const { error: err } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (err) throw err
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }, [setTasks])

  const deleteTask = useCallback(async (id: string, title?: string) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Task deleted',
      target_type: 'task',
      target_id: id,
      target_name: title,
    })
    // Real-time DELETE event in AppContext handles state update
  }, [currentUser])

  const bulkUpdateStatus = useCallback(async (ids: string[], status: TaskStatus) => {
    const { error: err } = await supabase.from('tasks').update({ status }).in('id', ids)
    if (err) throw err
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t))
  }, [setTasks])

  const bulkDelete = useCallback(async (ids: string[]) => {
    const { error: err } = await supabase.from('tasks').delete().in('id', ids)
    if (err) throw err
    // Real-time DELETE events handle state update; also apply locally for immediacy
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
  }, [setTasks])

  const bulkReassign = useCallback(async (ids: string[], assigneeId: string, assigneeName?: string) => {
    const { error: err } = await supabase
      .from('tasks')
      .update({ assignee_id: assigneeId, assignee_name: assigneeName })
      .in('id', ids)
    if (err) throw err

    const tasksToReassign = allTasks.filter(t => ids.includes(t.id))
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
  }, [currentUser, allTasks, setTasks])

  return {
    tasks, loading, error, fetchTasks,
    createTask, updateTask, updateTaskStatus, deleteTask,
    bulkUpdateStatus, bulkDelete, bulkReassign,
  }
}
