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
import { usePersistedForm } from '../hooks/usePersistedForm'
import { friendlyError, generateProjectKey } from '../utils/helpers'
import { useNavigate } from 'react-router-dom'
import type { Priority, ProjectStatus } from '../types'

interface Props { open: boolean; onClose: () => void }

const NEW_PROJECT_INITIAL = {
  name: '', key: '', description: '', client: '', department: '',
  priority: 'medium' as Priority, status: 'backlog' as ProjectStatus,
  issue_date: '', due_date: '', sop: '', reference_link: '',
}

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

  const [form, updateForm, clearForm] = usePersistedForm('new_project', NEW_PROJECT_INITIAL)

  // On open: reset non-serializable state; set department default for team leads if empty
  useEffect(() => {
    if (!open || !currentUser) return
    setFiles([])
    setIsDirty(false)
    setSelectedMembers([currentUser.id])
    // Set team lead's department if the field is currently empty (first open / after clear)
    if (!form.department && currentUser.role === 'teamLead' && currentUser.department) {
      updateForm({ department: currentUser.department })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (k: string, v: string) => {
    updateForm({ [k]: v } as Partial<typeof NEW_PROJECT_INITIAL>)
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
      clearForm()
      setFiles([])
      setSelectedMembers([])
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

  const inputCls = "w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] bg-[var(--surface-1)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all duration-150"
  const sectionLbl = "text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide mb-3"
  const isLead = currentUser?.role === 'teamLead'
  const deptMembers = members.filter(m => !form.department || m.department === form.department)
  const deadlineError = !!(form.issue_date && form.due_date && form.due_date < form.issue_date)

  const formatBytes = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <>
      <Modal open={open} onClose={handleClose} size="xl">
        <form onSubmit={handleSubmit} style={{ colorScheme: 'light' }} className="bg-[var(--surface-1)] text-[var(--ink-900)]">
          {/* Custom header */}
          <div className="-mx-6 -mt-6 px-5 py-4 border-b border-[var(--line-1)] flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-[var(--r-sm)] bg-[var(--primary-50)] flex items-center justify-center shrink-0">
              <FolderPlus size={20} className="text-[var(--primary)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--ink-900)]">Create Project</h2>
            <button
              type="button" onClick={handleClose}
              className="ml-auto p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Section 1 — Project info */}
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">
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
                <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={form.key}
                  onChange={e => set('key', e.target.value.toUpperCase().slice(0, 5))}
                  required maxLength={5}
                  className={`${inputCls} font-mono uppercase tracking-widest bg-[var(--surface-2)]`}
                  placeholder="ECW"
                />
                <p className="text-xs text-[var(--ink-400)] mt-1">Max 5 chars</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">Description</label>
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
                  <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">Client</label>
                  <input type="text" value={form.client} onChange={e => set('client', e.target.value)}
                    className={inputCls} placeholder="Client name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">Department</label>
                  <DepartmentDropdown
                    value={form.department} onChange={v => { set('department', v) }} disabled={isLead}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">Status</label>
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
                  <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">Issue Date</label>
                  <div className="relative">
                    <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)}
                      className={inputCls} />
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--ink-700)] block mb-1.5">Deadline</label>
                  <div className="relative">
                    <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                      min={form.issue_date || undefined}
                      className={`${inputCls} ${deadlineError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`} />
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
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
            <p className="text-xs text-[var(--ink-400)] mt-1">Describe the process, tools, and steps required for this project</p>
          </div>

          {/* Section 4 — TEAM MEMBERS */}
          {deptMembers.length > 0 && (
            <div className="mb-6">
              <p className={sectionLbl}>Team Members</p>
              <div className="border border-[var(--line-1)] rounded-[var(--r-lg)] max-h-[180px] overflow-y-auto">
                {deptMembers.map(m => {
                  const isSelected = selectedMembers.includes(m.id)
                  const isSelf = m.id === currentUser?.id
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-[var(--r-sm)] cursor-pointer transition-colors ${
                        isSelected ? 'bg-[var(--primary-50)] border border-[var(--primary)]/20' : 'hover:bg-[var(--surface-2)]'
                      } ${isSelf ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox" checked={isSelected} onChange={() => toggleMember(m.id)}
                        disabled={isSelf}
                        className="w-4 h-4 rounded accent-[var(--primary)]"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <Avatar name={m.name} size="xs" imageUrl={m.avatar_url} />
                      <span className="text-sm font-medium text-[var(--ink-700)]">
                        {m.name}
                        {isSelf && <span className="text-xs text-[var(--ink-400)] ml-1">(you)</span>}
                      </span>
                      {isSelected && !isSelf && <Check size={13} className="text-[var(--primary)] ml-auto" />}
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-[var(--primary)] font-medium mt-2">{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected</p>
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
                className={`border-2 border-dashed rounded-[var(--r-lg)] py-8 px-4 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? 'border-[var(--primary)] bg-[var(--primary-50)] scale-[1.01]'
                    : 'border-[var(--line-1)] bg-[var(--surface-2)] hover:border-[var(--primary)] hover:bg-[var(--primary-50)]'
                }`}
              >
                <UploadCloud size={32} className={`mx-auto ${dragging ? 'text-[var(--primary)]' : 'text-[var(--ink-400)]'}`} />
                <p className="text-sm text-[var(--ink-500)] mt-2">Drop files here or click to upload</p>
                <p className="text-xs text-[var(--ink-400)] mt-1">Max 10MB per file</p>
              </div>

              {/* Uploaded files */}
              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-[var(--surface-2)] rounded-[var(--r-sm)]">
                      <FileText size={14} className="text-[var(--ink-400)] shrink-0" />
                      <span className="text-sm text-[var(--ink-700)] truncate flex-1">{file.name}</span>
                      <span className="text-xs text-[var(--ink-400)] ml-auto shrink-0">{formatBytes(file.size)}</span>
                      <button
                        type="button" onClick={() => removeFile(idx)}
                        className="text-[var(--ink-400)] hover:text-red-500 ml-2 transition-colors"
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
                  <Link2 size={14} className="text-[var(--ink-400)]" />
                </div>
                <input
                  type="url" value={form.reference_link} onChange={e => set('reference_link', e.target.value)}
                  className={`${inputCls} pl-9`} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--line-1)] pt-4 mt-2 flex justify-end gap-3">
            <button
              type="button" onClick={handleClose}
              className="border border-[var(--line-1)] rounded-[var(--r-sm)] px-4 py-2.5 text-sm font-medium text-[var(--ink-700)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-700)] text-white rounded-[var(--r-sm)] px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-70 disabled:pointer-events-none"
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
