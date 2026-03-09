import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigneeId) return
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

  return (
    <Modal open={open} onClose={onClose} title={`Reassign ${taskIds.length} Tasks`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Assign to</label>
          <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} required
            className="w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 focus:outline-none focus:border-[#0A5540]">
            <option value="">Select member</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.department}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading || !assigneeId}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70 disabled:pointer-events-none">
            {loading && <LoadingSpinner size="sm" color="white" />}
            Reassign Tasks
          </button>
        </div>
      </form>
    </Modal>
  )
}
