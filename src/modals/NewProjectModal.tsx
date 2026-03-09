import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { FileUpload } from '../shared/FileUpload'
import { useProjects } from '../hooks/useProjects'
import { useTeam } from '../hooks/useTeam'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { friendlyError, generateProjectKey } from '../utils/helpers'
import { DEPARTMENTS } from '../constants'
import { useNavigate } from 'react-router-dom'
import type { Priority, ProjectStatus } from '../types'

interface Props { open: boolean; onClose: () => void }

export function NewProjectModal({ open, onClose }: Props) {
  const { currentUser } = useApp()
  const { createProject } = useProjects()
  const { members } = useTeam()
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '', key: '', description: '', client: '',
    department: currentUser?.role === 'teamLead' ? currentUser.department || '' : '',
    priority: 'medium' as Priority, status: 'backlog' as ProjectStatus,
    issue_date: '', due_date: '', sop: '', reference_link: '',
  })
  useEffect(() => {
    if (open && currentUser) {
      setSelectedMembers([currentUser.id])
      setFiles([])
      setForm(f => ({ ...f, department: currentUser.role === 'teamLead' ? currentUser.department || '' : '' }))
    }
  }, [open, currentUser])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleNameBlur = () => {
    if (form.name && !form.key) {
      set('key', generateProjectKey(form.name))
    }
  }

  const toggleMember = (id: string) => {
    if (id === currentUser?.id) return
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.key.trim()) return
    if (form.issue_date && form.due_date && form.due_date < form.issue_date) {
      toast.error('Deadline must be after issue date')
      return
    }
    setLoading(true)
    try {
      const inserted = await createProject({
        name: form.name, key: form.key.toUpperCase(), description: form.description || null,
        client: form.client || null, department: form.department,
        priority: form.priority, status: form.status,
        issue_date: form.issue_date || null, due_date: form.due_date || null,
        sop: form.sop || null, reference_link: form.reference_link || null,
        memberIds: selectedMembers, files,
      } as any)
      toast.success('Project created')
      onClose()
      navigate(`/app/projects/${inserted.id}`)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10"
  const labelCls = "text-sm font-medium text-gray-700 block mb-1.5"
  const isLead = currentUser?.role === 'teamLead'

  const deptMembers = members.filter(m => !form.department || m.department === form.department)

  return (
    <Modal open={open} onClose={onClose} title="Create Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} onBlur={handleNameBlur} required
              className={inputCls} placeholder="E-commerce Website" />
          </div>
          <div>
            <label className={labelCls}>Key <span className="text-red-500">*</span></label>
            <input type="text" value={form.key} onChange={e => set('key', e.target.value.toUpperCase().slice(0, 5))} required
              className={`${inputCls} font-mono uppercase`} placeholder="ECW" maxLength={5} />
            <p className="text-[11px] text-gray-400 mt-0.5">Max 5 chars</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            className={`${inputCls} resize-vertical`} placeholder="Optional project description" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Client</label>
            <input type="text" value={form.client} onChange={e => set('client', e.target.value)}
              className={inputCls} placeholder="Client name" />
          </div>
          <div>
            <label className={labelCls}>Department</label>
            <select value={form.department} onChange={e => set('department', e.target.value)} disabled={isLead} className={inputCls}>
              <option value="">Select department</option>
              {DEPARTMENTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
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
              <option value="completed">Completed</option>
              <option value="onHold">On Hold</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Issue Date</label>
            <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Deadline</label>
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
              min={form.issue_date || undefined} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>SOP</label>
          <textarea value={form.sop} onChange={e => set('sop', e.target.value)} rows={3}
            className={`${inputCls} resize-vertical`} placeholder="Step-by-step operating procedure" />
        </div>

        {deptMembers.length > 0 && (
          <div>
            <label className={labelCls}>Members</label>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-36 overflow-y-auto">
              {deptMembers.map(m => (
                <label key={m.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${m.id === currentUser?.id ? 'opacity-60' : ''}`}>
                  <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)}
                    disabled={m.id === currentUser?.id} className="accent-[#0A5540]" />
                  <span className="text-sm text-gray-800">{m.name}{m.id === currentUser?.id ? ' (you)' : ''}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Initial Files</label>
          <FileUpload files={files} onFiles={f => setFiles(prev => [...prev, ...f])} onRemove={i => setFiles(prev => prev.filter((_, idx) => idx !== i))} />
        </div>

        <div>
          <label className={labelCls}>Reference Link</label>
          <input type="url" value={form.reference_link} onChange={e => set('reference_link', e.target.value)}
            className={inputCls} placeholder="https://..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70 disabled:pointer-events-none">
            {loading && <LoadingSpinner size="sm" color="white" />}
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  )
}
