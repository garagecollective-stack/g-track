import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useTeam } from '../hooks/useTeam'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import type { Profile } from '../types'

interface Props { open: boolean; onClose: () => void; user: Profile | null }

export function DeleteUserModal({ open, onClose, user }: Props) {
  const { currentUser } = useApp()
  const { members, deleteUser } = useTeam()
  const toast = useToast()
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const directors = members.filter(m => m.role === 'director')
  const isLastDirector = user.role === 'director' && directors.length <= 1
  const isSelf = user.id === currentUser?.id
  const canDelete = !isLastDirector && !isSelf && typed === user.name

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteUser(user.id, user.name)
      toast.success('User deleted')
      setTyped('')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete User" size="sm">
      <div className="space-y-4">
        {(isLastDirector || isSelf) ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            {isSelf ? "You cannot delete your own account." : "Cannot delete the last Director."}
          </div>
        ) : (
          <>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800 mb-1">Deleting "{user.name}" will:</p>
              <ul className="text-sm text-red-700 space-y-0.5 list-disc list-inside">
                <li>Permanently remove their account</li>
                <li>Unassign all their tasks</li>
                <li>Remove them from all projects</li>
              </ul>
              <p className="text-xs text-red-600 mt-2 font-medium">This cannot be undone.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Type <span className="font-mono font-semibold">"{user.name}"</span> to confirm
              </label>
              <input
                type="text" value={typed} onChange={e => setTyped(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                placeholder={user.name}
              />
            </div>
          </>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          {!isLastDirector && !isSelf && (
            <button onClick={handleDelete} disabled={!canDelete || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:pointer-events-none">
              {loading && <LoadingSpinner size="sm" color="white" />} Delete Account
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
