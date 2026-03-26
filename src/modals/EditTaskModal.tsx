import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
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

interface TaskRevision {
  id: string
  task_id: string
  revision_number: number
  feedback: string
  submitted_by_name: string | null
  submitted_by_role: string | null
  status: string
  created_at: string
}

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
  const [activeTab, setActiveTab] = useState<'details' | 'revisions'>('details')
  const [revisions, setRevisions] = useState<TaskRevision[]>([])
  const [revisionsLoading, setRevisionsLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', project_id: '',
    priority: 'medium' as Priority, status: 'backlog' as TaskStatus,
    assignee_id: '', due_date: '', blocked_by_description: '',
  })
  const [showRevisionPanel, setShowRevisionPanel] = useState(false)
  const [revisionFeedback, setRevisionFeedback] = useState('')
  const [submittingRevision, setSubmittingRevision] = useState(false)

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
        blocked_by_description: task.blocked_by_description || '',
      })
      // Auto-show Revisions tab when the task has an active revision for the assignee
      const isAssignee = currentUser?.id === task.assignee_id
      setActiveTab(task.has_active_revision && isAssignee ? 'revisions' : 'details')
      setShowRevisionPanel(false)
      setRevisionFeedback('')
    }
  }, [task])

  useEffect(() => {
    if (activeTab === 'revisions' && task?.id) {
      setRevisionsLoading(true)
      supabase
        .from('task_revisions')
        .select('*')
        .eq('task_id', task.id)
        .order('revision_number', { ascending: false })
        .then(({ data }) => {
          setRevisions(data || [])
          setRevisionsLoading(false)
        })
    }
  }, [activeTab, task?.id])

  if (!task) return null
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const canEdit = currentUser?.role !== 'member' || task.assignee_id === currentUser?.id
  const hasRevisions = true // Always show Revisions tab so all roles can see history

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
        blocked_by_description: form.blocked_by_description || null,
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
        {/* Tab bar — only show if task has revisions */}
        {hasRevisions && (
          <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
            {(['details', 'revisions'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'revisions' && (task.revision_count ?? 0) > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                    {task.revision_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Revisions tab */}
        {activeTab === 'revisions' ? (
          <div className="space-y-3">
            {revisionsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : revisions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No revision history found.</p>
            ) : (
              revisions.map(rev => (
                <div key={rev.id} className="border border-orange-100 bg-orange-50 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-orange-700">Revision #{rev.revision_number}</span>
                    <span className="text-[10px] text-gray-400">{formatDate(rev.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{rev.feedback}</p>
                  {rev.submitted_by_name && (
                    <p className="text-xs text-gray-400">
                      Requested by <span className="font-medium text-gray-500">{rev.submitted_by_name}</span>
                      {rev.submitted_by_role && ` · ${rev.submitted_by_role}`}
                    </p>
                  )}
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    rev.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {rev.status === 'resolved' ? 'Resolved' : 'Pending'}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Details tab */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Revision notice for assignee */}
            {task.has_active_revision && currentUser?.id === task.assignee_id && (
              <div className="flex items-center justify-between gap-3 border border-orange-200 bg-orange-50 rounded-xl px-3.5 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-orange-500 text-base shrink-0">⟲</span>
                  <p className="text-sm font-semibold text-orange-700">Revision requested</p>
                </div>
                <button type="button" onClick={() => setActiveTab('revisions')}
                  className="text-xs px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium shrink-0">
                  View feedback →
                </button>
              </div>
            )}
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
                  <option value="onHold">⏸ On Hold (Dependency)</option>
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
            {(currentUser?.role === 'director' || currentUser?.role === 'teamLead') && (task.creator || task.created_by_name) && (
              <div>
                <label className={labelCls}>Assigned By</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  {task.creator ? (
                    task.creator.name === task.assignee_name ? (
                      <em className="text-xs text-gray-400">Self-assigned</em>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Avatar name={task.creator.name} size="xs" imageUrl={task.creator.avatar_url} />
                        <span className="text-sm text-gray-600">{task.creator.name}</span>
                        {currentUser?.role === 'teamLead' && task.creator.department && task.creator.department !== currentUser.department && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">
                            ↔ {task.creator.department}
                          </span>
                        )}
                      </div>
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

            {/* Blocked by description (only shown when On Hold) */}
            {form.status === 'onHold' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Blocked by
                </label>
                <textarea
                  value={form.blocked_by_description}
                  onChange={e => set('blocked_by_description', e.target.value)}
                  placeholder="What is this task blocked by?"
                  rows={2}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#0A5540] focus:ring-1 focus:ring-[#0A5540]/20"
                />
              </div>
            )}

            {/* Request Revision button for done tasks */}
            {task.status === 'done' && (currentUser?.role === 'director' || currentUser?.role === 'teamLead') && !showRevisionPanel && (
              <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-700">Task is marked Done</p>
                  {task.revision_count && task.revision_count > 0 && (
                    <p className="text-xs text-orange-500 mt-0.5">Revision #{task.revision_count}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowRevisionPanel(true)}
                  className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  ← Reopen as Revision
                </button>
              </div>
            )}

            {/* Revision panel (inline) */}
            {showRevisionPanel && (
              <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-orange-700">Request Revision</p>
                  <button type="button" onClick={() => { setShowRevisionPanel(false); setRevisionFeedback('') }}
                    className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                </div>
                <textarea
                  value={revisionFeedback}
                  onChange={e => setRevisionFeedback(e.target.value)}
                  placeholder="Describe what needs to be revised..."
                  rows={3}
                  className="w-full text-sm bg-white border border-orange-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-orange-400"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={!revisionFeedback.trim() || submittingRevision}
                  onClick={async () => {
                    if (!revisionFeedback.trim()) return
                    setSubmittingRevision(true)
                    try {
                      await supabase.from('task_revisions').insert({
                        task_id: task.id,
                        revision_number: (task.revision_count || 0) + 1,
                        feedback: revisionFeedback,
                        submitted_by: currentUser?.id,
                        submitted_by_name: currentUser?.name,
                        submitted_by_role: currentUser?.role,
                        status: 'pending',
                      })
                      await updateTask(task.id, {
                        status: 'inProgress',
                        has_active_revision: true,
                        revision_count: (task.revision_count || 0) + 1,
                      })
                      // Notify assignee
                      if (task.assignee_id) {
                        await supabase.from('notifications').insert({
                          user_id: task.assignee_id,
                          title: 'Revision Requested',
                          message: `${currentUser?.name} requested a revision on "${task.title}": ${revisionFeedback.slice(0, 80)}`,
                          type: 'task',
                          related_id: task.id,
                          related_type: 'task',
                        })
                      }
                      toast.success('✅ Task reopened for revision')
                      onClose()
                    } catch (err) {
                      toast.error('Failed to submit revision')
                    } finally {
                      setSubmittingRevision(false)
                    }
                  }}
                  className="w-full py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submittingRevision ? 'Submitting...' : 'Submit & Reopen Task'}
                </button>
              </div>
            )}

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
        )}
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
