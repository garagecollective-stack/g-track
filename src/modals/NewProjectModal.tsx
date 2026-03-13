import { useState, useEffect } from 'react'
import { FolderPlus, X, Calendar, Link2, Check, UploadCloud, FileText } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { DepartmentDropdown } from '../shared/DepartmentDropdown'
import { Avatar } from '../shared/Avatar'
import { useProjects } from '../hooks/useProjects'
import { useTeam } from '../hooks/useTeam'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { friendlyError, generateProjectKey } from '../utils/helpers'
import { useNavigate } from 'react-router-dom'
import type { Priority, ProjectStatus } from '../types'

interface Props { open: boolean; onClose: () => void }

export function NewProjectModal({ open, onClose }: Props) {
  const { currentUser } = useApp()
  const { createProject } = useProjects()
  const { members } = useTeam()
  const toast = useToast()
  const navigate = useNavigate()

  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateConfirm, setShowCreateConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
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
      setIsDirty(false)
      setForm({
        name: '', key: '', description: '', client: '',
        department: currentUser.role === 'teamLead' ? currentUser.department || '' : '',
        priority: 'medium', status: 'backlog',
        issue_date: '', due_date: '', sop: '', reference_link: '',
      })
    }
  }, [open, currentUser])

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setIsDirty(true)
  }

  const handleNameBlur = () => {
    if (form.name && !form.key) set('key', generateProjectKey(form.name))
  }

  const toggleMember = (id: string) => {
    if (id === currentUser?.id) return
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    setIsDirty(true)
  }

  const addFiles = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles])
    setIsDirty(true)
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.key.trim()) return
    if (form.issue_date && form.due_date && form.due_date < form.issue_date) {
      toast.error('Deadline must be after issue date')
      return
    }
    setShowCreateConfirm(true)
  }

  const handleConfirmedCreate = async () => {
    setIsSubmitting(true)
    try {
      const inserted = await createProject({
        name: form.name, key: form.key.toUpperCase(), description: form.description || null,
        client: form.client || null, department: form.department,
        priority: form.priority, status: form.status,
        issue_date: form.issue_date || null, due_date: form.due_date || null,
        sop: form.sop || null, reference_link: form.reference_link || null,
        memberIds: selectedMembers, files,
      } as any)
      toast.success(`Project '${form.name}' created successfully`)
      setIsDirty(false)
      setShowCreateConfirm(false)
      onClose()
      navigate(`/app/projects/${inserted.id}`)
    } catch (err) {
      toast.error(friendlyError(err))
      setShowCreateConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isDirty) { setShowDiscardConfirm(true) } else { onClose() }
  }

  const handleDiscard = () => {
    setShowDiscardConfirm(false)
    setIsDirty(false)
    onClose()
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10 transition-all duration-150"
  const sectionLbl = "text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3"
  const isLead = currentUser?.role === 'teamLead'
  const deptMembers = members.filter(m => !form.department || m.department === form.department)
  const deadlineError = !!(form.issue_date && form.due_date && form.due_date < form.issue_date)

  const formatBytes = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <>
      <Modal open={open} onClose={handleClose} size="lg">
        <form onSubmit={handleSubmit} style={{ colorScheme: 'light' }} className="bg-white text-gray-900">
          {/* Custom header */}
          <div className="-mx-6 -mt-6 px-5 py-4 border-b border-gray-100 flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#edf8f4] flex items-center justify-center shrink-0">
              <FolderPlus size={20} className="text-[#0A5540]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create Project</h2>
            <button
              type="button" onClick={handleClose}
              className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Section 1 — Project info (no section label) */}
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={form.name}
                  onChange={e => set('name', e.target.value)}
                  onBlur={handleNameBlur} required
                  className={inputCls} placeholder="E-commerce Website"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={form.key}
                  onChange={e => set('key', e.target.value.toUpperCase().slice(0, 5))}
                  required maxLength={5}
                  className={`${inputCls} font-mono uppercase tracking-widest bg-gray-50`}
                  placeholder="ECW"
                />
                <p className="text-xs text-gray-400 mt-1">Max 5 chars</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Description</label>
              <textarea
                value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className={`${inputCls} resize-y`} style={{ minHeight: 80 }}
                placeholder="Optional project description"
              />
            </div>
          </div>

          {/* Section 2 — DETAILS */}
          <div className="mb-6">
            <p className={sectionLbl}>Details</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Client</label>
                  <input type="text" value={form.client} onChange={e => set('client', e.target.value)}
                    className={inputCls} placeholder="Client name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Department</label>
                  <DepartmentDropdown
                    value={form.department} onChange={v => { set('department', v) }} disabled={isLead}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Status</label>
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
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Issue Date</label>
                  <div className="relative">
                    <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)}
                      className={inputCls} />
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Deadline</label>
                  <div className="relative">
                    <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                      min={form.issue_date || undefined}
                      className={`${inputCls} ${deadlineError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`} />
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {deadlineError && (
                    <p className="text-xs text-red-500 mt-1">Deadline must be after issue date</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 — PROCEDURE */}
          <div className="mb-6">
            <p className={sectionLbl}>Procedure</p>
            <textarea
              value={form.sop} onChange={e => set('sop', e.target.value)} rows={4}
              className={`${inputCls} resize-y`} style={{ minHeight: 100 }}
              placeholder="Step-by-step operating procedure"
            />
            <p className="text-xs text-gray-400 mt-1">Describe the process, tools, and steps required for this project</p>
          </div>

          {/* Section 4 — TEAM MEMBERS */}
          {deptMembers.length > 0 && (
            <div className="mb-6">
              <p className={sectionLbl}>Team Members</p>
              <div className="border border-gray-100 rounded-xl max-h-[180px] overflow-y-auto">
                {deptMembers.map(m => {
                  const isSelected = selectedMembers.includes(m.id)
                  const isSelf = m.id === currentUser?.id
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#edf8f4] border border-[#0A5540]/20' : 'hover:bg-gray-50'
                      } ${isSelf ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox" checked={isSelected} onChange={() => toggleMember(m.id)}
                        disabled={isSelf}
                        className="w-4 h-4 rounded accent-[#0A5540]"
                        style={{ accentColor: '#0A5540' }}
                      />
                      <Avatar name={m.name} size="xs" imageUrl={m.avatar_url} />
                      <span className="text-sm font-medium text-gray-700">
                        {m.name}
                        {isSelf && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                      </span>
                      {isSelected && !isSelf && <Check size={13} className="text-[#0A5540] ml-auto" />}
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-[#0A5540] font-medium mt-2">{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected</p>
            </div>
          )}

          {/* Section 5 — FILES & LINKS */}
          <div className="mb-6">
            <p className={sectionLbl}>Files &amp; Links</p>
            <div className="space-y-3">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => {
                  const inp = document.createElement('input')
                  inp.type = 'file'; inp.multiple = true
                  inp.onchange = () => inp.files && addFiles(Array.from(inp.files))
                  inp.click()
                }}
                className={`border-2 border-dashed rounded-xl py-8 px-4 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? 'border-[#0A5540] bg-[#edf8f4] scale-[1.01]'
                    : 'border-gray-200 bg-gray-50 hover:border-[#0A5540] hover:bg-[#edf8f4]'
                }`}
              >
                <UploadCloud size={32} className={`mx-auto ${dragging ? 'text-[#0A5540]' : 'text-gray-300'}`} />
                <p className="text-sm text-gray-500 mt-2">Drop files here or click to upload</p>
                <p className="text-xs text-gray-400 mt-1">Max 10MB per file</p>
              </div>

              {/* Uploaded files */}
              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-400 ml-auto shrink-0">{formatBytes(file.size)}</span>
                      <button
                        type="button" onClick={() => removeFile(idx)}
                        className="text-gray-400 hover:text-red-500 ml-2 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Reference link */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Link2 size={14} className="text-gray-400" />
                </div>
                <input
                  type="url" value={form.reference_link} onChange={e => set('reference_link', e.target.value)}
                  className={`${inputCls} pl-9`} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 mt-2 flex justify-end gap-3">
            <button
              type="button" onClick={handleClose}
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 bg-[#0A5540] hover:bg-[#0d6b51] text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-70 disabled:pointer-events-none"
            >
              {isSubmitting && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showCreateConfirm}
        onClose={() => setShowCreateConfirm(false)}
        onConfirm={handleConfirmedCreate}
        title="Create Project?"
        message={`Create '${form.name}' for ${form.client || 'no client'}? ${selectedMembers.length} team member(s) will be notified and added to this project.`}
        confirmLabel="Yes, Create Project"
        variant="confirm"
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleDiscard}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to close? All entered information will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="warning"
      />
    </>
  )
}
