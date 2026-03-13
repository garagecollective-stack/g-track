import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { Avatar } from '../shared/Avatar'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useTeam } from '../hooks/useTeam'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { friendlyError, formatDate } from '../utils/helpers'
import type { Task, Priority, TaskStatus } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  task: Task | null
}

export function EditTaskModal({ open, onClose, task }: Props) {
  const { currentUser } = useApp()
  const { updateTask, deleteTask } = useTasks()
  const { projects } = useProjects()
  const { members } = useTeam()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', project_id: '',
    priority: 'medium' as Priority, status: 'backlog' as TaskStatus,
    assignee_id: '', due_date: '',
  })

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        project_id: task.project_id || '',
        priority: task.priority,
        status: task.status,
        assignee_id: task.assignee_id || '',
        due_date: task.due_date || '',
      })
    }
  }, [task])

  if (!task) return null
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const canEdit = currentUser?.role !== 'member' || task.assignee_id === currentUser?.id

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSaveConfirm(true)
  }

  const handleConfirmedSave = async () => {
    setLoading(true)
    try {
      const assignee = members.find(m => m.id === form.assignee_id)
      const project = projects.find(p => p.id === form.project_id)
      await updateTask(task.id, {
        title: form.title,
        description: form.description || null,
        project_id: form.project_id || null,
        project_name: project?.name || null,
        priority: form.priority,
        status: form.status,
        assignee_id: form.assignee_id || null,
        assignee_name: assignee?.name || null,
        due_date: form.due_date || null,
      })
      toast.success('Task updated')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    await deleteTask(task.id, task.title)
    toast.success('Task deleted')
    onClose()
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10"
  const labelCls = "text-sm font-medium text-gray-700 block mb-1.5"

  return (
    <>
      <Modal open={open} onClose={onClose} title="Edit Task">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required
              disabled={!canEdit} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              disabled={!canEdit} className={`${inputCls} resize-vertical min-h-[80px]`} />
          </div>
          <div>
            <label className={labelCls}>Project</label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)} disabled={!canEdit} className={inputCls}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} disabled={!canEdit} className={inputCls}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                <option value="backlog">Backlog</option>
                <option value="inProgress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          {currentUser?.role !== 'member' && (
            <div>
              <label className={labelCls}>Assignee</label>
              <select value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)} className={inputCls}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          {currentUser?.role === 'director' && (task.creator || task.created_by_name) && (
            <div>
              <label className={labelCls}>Assigned By</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {task.creator ? (
                  task.creator.name === task.assignee_name ? (
                    <em className="text-xs text-gray-400">Self-assigned</em>
                  ) : (
                    <>
                      <Avatar name={task.creator.name} size="xs" imageUrl={task.creator.avatar_url} />
                      <span className="text-sm text-gray-600">{task.creator.name}</span>
                    </>
                  )
                ) : task.created_by_name ? (
                  <>
                    <Avatar name={task.created_by_name} size="xs" />
                    <span className="text-sm text-gray-600">{task.created_by_name}</span>
                  </>
                ) : null}
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} disabled={!canEdit} className={inputCls} />
          </div>

          <p className="text-xs text-gray-400">
            Created on {formatDate(task.created_at)}
          </p>

          <div className="flex items-center justify-between pt-2">
            {currentUser?.role !== 'member' ? (
              <button type="button" onClick={() => setShowDelete(true)}
                className="px-4 py-2 text-sm font-medium text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                Delete
              </button>
            ) : <div />}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70 disabled:pointer-events-none">
                {loading && <LoadingSpinner size="sm" color="white" />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleConfirmedSave}
        title="Save Changes"
        description={`Save changes to "${task.title}"?`}
        confirmLabel="Save"
        variant="warning"
      />

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        description={`Permanently delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  )
}
