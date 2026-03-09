import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useProjects } from '../hooks/useProjects'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import { DEPARTMENTS } from '../constants'
import type { Project, Priority, ProjectStatus } from '../types'

interface Props { open: boolean; onClose: () => void; project: Project | null }

export function EditProjectModal({ open, onClose, project }: Props) {
  const { currentUser } = useApp()
  const { updateProject } = useProjects()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', client: '', department: '',
    priority: 'medium' as Priority, status: 'backlog' as ProjectStatus,
    issue_date: '', due_date: '', sop: '', reference_link: '',
  })

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        client: project.client || '',
        department: project.department || '',
        priority: project.priority,
        status: project.status,
        issue_date: project.issue_date || '',
        due_date: project.due_date || '',
        sop: project.sop || '',
        reference_link: project.reference_link || '',
      })
    }
  }, [project])

  if (!project) return null
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10"
  const labelCls = "text-sm font-medium text-gray-700 block mb-1.5"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProject(project.id, {
        name: form.name, description: form.description || null,
        client: form.client || null, department: form.department,
        priority: form.priority, status: form.status,
        issue_date: form.issue_date || null, due_date: form.due_date || null,
        sop: form.sop || null, reference_link: form.reference_link || null,
      })
      toast.success('Project updated')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className={labelCls}>Name</label><input type="text" value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} /></div>
        <div><label className={labelCls}>Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={`${inputCls} resize-vertical`} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Client</label><input type="text" value={form.client} onChange={e => set('client', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Department</label>
            <select value={form.department} onChange={e => set('department', e.target.value)} disabled={currentUser?.role === 'teamLead'} className={inputCls}>
              {DEPARTMENTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
              <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          <div><label className={labelCls}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              <option value="backlog">Backlog</option><option value="inProgress">In Progress</option><option value="completed">Completed</option><option value="onHold">On Hold</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Issue Date</label><input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Deadline</label><input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>SOP</label><textarea value={form.sop} onChange={e => set('sop', e.target.value)} rows={3} className={`${inputCls} resize-vertical`} /></div>
        <div><label className={labelCls}>Reference Link</label><input type="url" value={form.reference_link} onChange={e => set('reference_link', e.target.value)} className={inputCls} placeholder="https://..." /></div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70 disabled:pointer-events-none">
            {loading && <LoadingSpinner size="sm" color="white" />} Update Project
          </button>
        </div>
      </form>
    </Modal>
  )
}
