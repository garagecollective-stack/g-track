import { useState } from 'react'
import { Pencil, FileText } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useToast } from '../../hooks/useToast'
import { friendlyError } from '../../utils/helpers'
import { LoadingSpinner } from '../../shared/LoadingSpinner'

interface Props { projectId: string; sop: string | null }

export function ProjectSOP({ projectId, sop }: Props) {
  const { currentUser } = useApp()
  const { updateProject } = useProjects()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(sop || '')
  const [saving, setSaving] = useState(false)

  const canEdit = currentUser?.role !== 'member'

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProject(projectId, { sop: value || null })
      toast.success('SOP updated')
      setEditing(false)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5 shadow-[var(--shadow-xs)]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--line-1)]">
        <div>
          <span className="eyebrow">— Playbook</span>
          <h3 className="text-[15px] font-semibold text-[var(--ink-900)] mt-0.5 font-display tracking-[-0.01em]">Standard Operating Procedure</h3>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-[var(--ink-500)] hover:text-[var(--ink-900)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
            <Pencil size={13} strokeWidth={1.8} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={12}
            className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2.5 text-[13px] text-[var(--ink-900)] bg-[var(--surface-1)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 resize-vertical font-mono leading-relaxed transition-colors"
            placeholder="Enter step-by-step operating procedure..."
          />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setEditing(false); setValue(sop || '') }}
              className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-70">
              {saving && <LoadingSpinner size="sm" color="white" />} Save
            </button>
          </div>
        </div>
      ) : sop ? (
        <pre className="text-[13px] text-[var(--ink-700)] whitespace-pre-wrap font-sans leading-relaxed">{sop}</pre>
      ) : (
        <div className="text-center py-10">
          <div className="mx-auto w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-2.5">
            <FileText size={16} strokeWidth={1.8} className="text-[var(--ink-400)]" />
          </div>
          <p className="text-[13px] text-[var(--ink-400)]">
            No SOP defined yet.{canEdit && ' Click Edit to add one.'}
          </p>
        </div>
      )}
    </div>
  )
}
