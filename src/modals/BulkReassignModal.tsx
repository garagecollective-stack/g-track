import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { useTeam } from '../hooks/useTeam'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'

interface Props {
  open: boolean
  onClose: () => void
  taskIds: string[]
  onReassign: (assigneeId: string, assigneeName?: string) => Promise<void>
}

export function BulkReassignModal({ open, onClose, taskIds, onReassign }: Props) {
  const { members } = useTeam()
  const toast = useToast()
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigneeId) return
    setShowConfirm(true)
  }

  const handleConfirmedReassign = async () => {
    setLoading(true)
    try {
      const assignee = members.find(m => m.id === assigneeId)
      await onReassign(assigneeId, assignee?.name)
      toast.success(`${taskIds.length} tasks reassigned`)
      onClose()
      setAssigneeId('')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const selectedMember = members.find(m => m.id === assigneeId)

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Reassign ${taskIds.length} Tasks`} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Assign to</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} required
              className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] focus:outline-none focus:border-[var(--primary)]">
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.department}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--ink-700)] bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !assigneeId}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-70 disabled:pointer-events-none">
              {loading && <LoadingSpinner size="sm" color="white" />}
              Reassign Tasks
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedReassign}
        title="Reassign Tasks"
        description={`Reassign ${taskIds.length} task${taskIds.length !== 1 ? 's' : ''} to ${selectedMember?.name}?`}
        confirmLabel="Reassign"
        variant="warning"
      />
    </>
  )
}
