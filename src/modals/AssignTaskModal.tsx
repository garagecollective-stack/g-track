import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useTeam } from '../hooks/useTeam'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import type { Priority, TaskStatus } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  projectId?: string
  defaultAssigneeId?: string
}

export function AssignTaskModal({ open, onClose, projectId, defaultAssigneeId }: Props) {
  const { currentUser } = useApp()
  const { createTask } = useTasks()
  const { projects } = useProjects()
  const { members } = useTeam()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: projectId || '',
    priority: 'medium' as Priority,
    status: 'backlog' as TaskStatus,
    assignee_id: defaultAssigneeId || '',
    due_date: '',
  })

  useEffect(() => {
    if (open) setForm(f => ({ ...f, project_id: projectId || '', assignee_id: defaultAssigneeId || '' }))
  }, [open, projectId, defaultAssigneeId])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const selectedProject = projects.find(p => p.id === form.project_id)
      const assignee = members.find(m => m.id === form.assignee_id)
      await createTask({
        title: form.title,
        description: form.description || null,
        project_id: form.project_id || null,
        project_name: selectedProject?.name || null,
        department: currentUser?.department || selectedProject?.department || 'Company',
        priority: form.priority,
        status: form.status,
        assignee_id: form.assignee_id || null,
        assignee_name: assignee?.name || null,
        due_date: form.due_date || null,
      })
      toast.success('Task created')
      onClose()
      setForm({ title: '', description: '', project_id: '', priority: 'medium', status: 'backlog', assignee_id: '', due_date: '' })
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10"
  const labelCls = "text-sm font-medium text-gray-700 block mb-1.5"

  return (
    <Modal open={open} onClose={onClose} title="Assign Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Title <span className="text-red-500">*</span></label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required className={inputCls} placeholder="Task title" />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
            className={`${inputCls} resize-vertical min-h-[80px]`} placeholder="Optional description" />
        </div>
        <div>
          <label className={labelCls}>Project</label>
          <select value={form.project_id} onChange={e => set('project_id', e.target.value)} className={inputCls}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
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
        <div>
          <label className={labelCls}>Assignee</label>
          <select value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)} className={inputCls}>
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.department})</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70 disabled:pointer-events-none">
            {loading && <LoadingSpinner size="sm" color="white" />}
            Assign Task
          </button>
        </div>
      </form>
    </Modal>
  )
}
