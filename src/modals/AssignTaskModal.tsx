import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { usePersistedForm } from '../hooks/usePersistedForm'
import { friendlyError } from '../utils/helpers'
import { supabase } from '../lib/supabase'
import type { Priority, TaskStatus } from '../types'

interface Assignee {
  id: string
  name: string
  role: string
  department: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  projectId?: string
  defaultAssigneeId?: string
}

const INITIAL_FORM = {
  title: '',
  description: '',
  project_id: '',
  priority: 'medium' as Priority,
  status: 'backlog' as TaskStatus,
  due_date: '',
}

export function AssignTaskModal({ open, onClose, projectId, defaultAssigneeId }: Props) {
  const { currentUser } = useApp()
  const { createTask } = useTasks()
  const { projects } = useProjects()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [assigneeSearch, setAssigneeSearch] = useState('')

  // Feature 8: Multi-select assignees
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    defaultAssigneeId ? [defaultAssigneeId] : []
  )

  const [form, updateForm, clearForm] = usePersistedForm('assign_task', INITIAL_FORM)

  // Fetch all active members + team leads from all departments
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, role, department')
      .in('role', ['member', 'teamLead'])
      .eq('is_active', true)
      .order('department', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data }) => setAssignees(data || []))
  }, [])

  // When the modal opens, update project_id and assignee from props (but keep other fields)
  useEffect(() => {
    if (open) {
      updateForm({ project_id: projectId || '' })
      if (defaultAssigneeId) setSelectedAssignees([defaultAssigneeId])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, defaultAssigneeId])

  const set = (k: string, v: string) => updateForm({ [k]: v } as Partial<typeof INITIAL_FORM>)

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setShowConfirm(true)
  }

  const handleConfirmedSubmit = async () => {
    setLoading(true)
    try {
      const selectedProject = projects.find(p => p.id === form.project_id)
      const primaryAssigneeId = selectedAssignees[0] || null
      const primaryAssignee = assignees.find(m => m.id === primaryAssigneeId)

      const inserted = await createTask({
        title: form.title,
        description: form.description || null,
        project_id: form.project_id || null,
        project_name: selectedProject?.name || null,
        department: currentUser?.department || selectedProject?.department || 'Company',
        priority: form.priority,
        status: form.status,
        assignee_id: primaryAssigneeId,
        assignee_name: primaryAssignee?.name || null,
        due_date: form.due_date || null,
      })

      // Feature 8: Insert all selected assignees into task_assignees table
      if (inserted && selectedAssignees.length > 0) {
        const rows = selectedAssignees.map(userId => ({
          task_id: inserted.id,
          user_id: userId,
          assigned_by: currentUser?.id,
        }))
        await supabase.from('task_assignees').upsert(rows, { onConflict: 'task_id,user_id' }).then(() => {})

        // Notify ALL assignees (the DB trigger covers primary; this covers additional + is the frontend backup)
        const projectSuffix = selectedProject ? ` in ${selectedProject.name}` : ''
        const notifRows = selectedAssignees
          .filter(userId => userId !== currentUser?.id) // don't notify self
          .map(userId => ({
            user_id: userId,
            title: 'New task assigned',
            message: `📋 ${currentUser?.name} assigned you "${form.title}"${projectSuffix}`,
            type: 'task',
            related_id: inserted.id,
            related_type: 'task',
            read: false,
          }))
        if (notifRows.length > 0) {
          await supabase.from('notifications').insert(notifRows).then(() => {})
        }
      }

      toast.success('Task created')
      clearForm()
      setSelectedAssignees([])
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] bg-[var(--surface-1)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
  const labelCls = "text-sm font-medium text-[var(--ink-700)] block mb-1.5"

  const filteredAssignees = assigneeSearch
    ? assignees.filter(a => a.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
    : assignees

  const selectedNames = selectedAssignees
    .map(id => assignees.find(a => a.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <Modal open={open} onClose={onClose} title="Assign Task">
        <div style={{ colorScheme: 'light' }} className="bg-[var(--surface-1)] text-[var(--ink-900)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Title <span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required className={inputCls} placeholder="Task title" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className={`${inputCls} resize-y min-h-[80px]`} placeholder="Optional description" />
            </div>
            <div>
              <label className={labelCls}>Project</label>
              <select value={form.project_id} onChange={e => set('project_id', e.target.value)} className={inputCls}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <option value="onHold">⏸ On Hold</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            {/* Feature 8: Multi-select assignees */}
            <div>
              <label className={labelCls}>
                Assign To
                {selectedAssignees.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-[var(--primary)]">
                    {selectedAssignees.length} selected
                  </span>
                )}
              </label>
              <div className="border border-[var(--line-1)] rounded-[var(--r-sm)] overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--line-1)] bg-[var(--surface-2)]">
                  <input
                    type="text"
                    value={assigneeSearch}
                    onChange={e => setAssigneeSearch(e.target.value)}
                    placeholder="🔍 Search members..."
                    className="w-full text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] bg-transparent focus:outline-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-[var(--line-1)]">
                  {filteredAssignees.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAssignee(a.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left ${
                        selectedAssignees.includes(a.id) ? 'bg-[var(--primary-50)]' : ''
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedAssignees.includes(a.id)
                          ? 'bg-[var(--primary)] border-[var(--primary)]'
                          : 'border-[var(--line-2)]'
                      }`}>
                        {selectedAssignees.includes(a.id) && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                            <path d="M1 5l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="flex-1 text-sm text-[var(--ink-900)]">{a.name}</span>
                      <span className="text-xs text-[var(--ink-400)]">{a.department}</span>
                      {a.role === 'teamLead' && (
                        <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] rounded-full px-1.5 py-0.5 font-medium">Lead</span>
                      )}
                    </button>
                  ))}
                  {filteredAssignees.length === 0 && (
                    <p className="px-3 py-4 text-sm text-[var(--ink-400)] text-center">No members found</p>
                  )}
                </div>
                {selectedAssignees.length > 0 && (
                  <div className="px-3 py-2 border-t border-[var(--line-1)] bg-[var(--surface-2)]">
                    <p className="text-xs text-[var(--ink-500)]">
                      Selected: <span className="text-[var(--ink-700)] font-medium">{selectedNames}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[var(--ink-700)] bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-70 disabled:pointer-events-none">
                {loading && <LoadingSpinner size="sm" color="white" />}
                Assign Task
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedSubmit}
        title="Assign Task"
        description={`Create task "${form.title}"${selectedAssignees.length > 0 ? ` and assign to ${selectedNames}` : ''}?`}
        confirmLabel="Assign Task"
        variant="confirm"
      />
    </>
  )
}
