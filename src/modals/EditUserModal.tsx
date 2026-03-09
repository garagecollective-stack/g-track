import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useTeam } from '../hooks/useTeam'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import { DEPARTMENTS } from '../constants'
import type { Profile, Role } from '../types'

interface Props { open: boolean; onClose: () => void; user: Profile | null }

export function EditUserModal({ open, onClose, user }: Props) {
  const { updateUserRole, updateUserDept } = useTeam()
  const toast = useToast()
  const [role, setRole] = useState<Role>('member')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) { setRole(user.role); setDepartment(user.department || '') }
  }, [user])

  if (!user) return null

  const handleSave = async () => {
    setLoading(true)
    try {
      if (role !== user.role) await updateUserRole(user.id, role, user.name)
      if (department !== user.department) await updateUserDept(user.id, department, user.name)
      toast.success('User updated')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 focus:outline-none focus:border-[#0A5540]"

  return (
    <Modal open={open} onClose={onClose} title={`Edit User — ${user.name}`} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Role</label>
          <select value={role} onChange={e => setRole(e.target.value as Role)} className={inputCls}>
            <option value="director">Director</option>
            <option value="teamLead">Team Lead</option>
            <option value="member">Member</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Department</label>
          <select value={department} onChange={e => setDepartment(e.target.value)} className={inputCls}>
            <option value="">No department</option>
            {DEPARTMENTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70">
            {loading && <LoadingSpinner size="sm" color="white" />} Save Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}
