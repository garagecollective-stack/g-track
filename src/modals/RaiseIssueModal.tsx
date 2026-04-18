import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { useIssues } from '../hooks/useIssues'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import type { IssuePriority } from '../types'

export interface IssueEntity {
  type: 'task' | 'project'
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  presetEntity?: IssueEntity
}

export function RaiseIssueModal({ open, onClose, presetEntity }: Props) {
  const { createIssue } = useIssues()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('medium')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showConfirm, setShowConfirm] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (title.trim().length < 5) e.title = 'Title must be at least 5 characters'
    if (description.trim().length < 20) e.description = 'Description must be at least 20 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (!presetEntity) return
    setShowConfirm(true)
  }

  const handleConfirmedSubmit = async () => {
    if (!presetEntity) return
    setLoading(true)
    try {
      await createIssue({
        entity_type: presetEntity.type,
        entity_id: presetEntity.id,
        entity_name: presetEntity.name,
        title: title.trim(),
        description: description.trim(),
        priority,
      })
      toast.success('Issue submitted. Your team lead has been notified.')
      handleClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setErrors({})
    onClose()
  }

  const content = (
    <div className="space-y-4">
      {/* Related to */}
      {presetEntity && (
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-700)] mb-1.5">Related to</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm text-[var(--ink-700)]">
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-200 text-[var(--ink-700)]">
              {presetEntity.type}
            </span>
            <span className="font-medium truncate">{presetEntity.name}</span>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-[var(--ink-700)] mb-1.5">
          Issue Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })) }}
          placeholder="Brief summary of the issue..."
          className={`w-full text-sm border rounded-[var(--r-lg)] px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] transition-colors ${
            errors.title ? 'border-red-300 bg-red-50' : 'border-[var(--line-1)]'
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-xs font-semibold text-[var(--ink-700)] mb-1.5">Priority</label>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as IssuePriority)}
          className="w-full text-sm border border-[var(--line-1)] rounded-[var(--r-lg)] px-3 py-2.5 bg-[var(--surface-1)] focus:outline-none focus:border-[var(--primary)]"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-[var(--ink-700)] mb-1.5">
          Describe your issue or query <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })) }}
          placeholder="Be specific — what happened, what you expected, and what you've already tried."
          rows={4}
          className={`w-full text-sm border rounded-[var(--r-lg)] px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] resize-none transition-colors ${
            errors.description ? 'border-red-300 bg-red-50' : 'border-[var(--line-1)]'
          }`}
        />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
        <p className="mt-1 text-[11px] text-[var(--ink-400)]">Minimum 20 characters · {description.length} typed</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-[var(--r-sm)] transition-colors disabled:opacity-50"
        >
          <AlertCircle size={14} />
          {loading ? 'Submitting...' : 'Submit Issue'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Raise an Issue or Query">
        {content}
      </Modal>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedSubmit}
        title="Submit Issue"
        description={`Submit "${title}" as a ${priority} priority issue? Your team lead will be notified.`}
        confirmLabel="Submit Issue"
        variant="warning"
      />
    </>
  )
}
