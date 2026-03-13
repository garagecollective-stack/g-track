import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { RoleDropdown } from '../shared/RoleDropdown'
import { DepartmentDropdown } from '../shared/DepartmentDropdown'
import { useTeam } from '../hooks/useTeam'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import type { Profile, Role } from '../types'

interface Props { open: boolean; onClose: () => void; user: Profile | null }

export function EditUserModal({ open, onClose, user }: Props) {
  const { updateUserRole, updateUserDept } = useTeam()
  const toast = useToast()
  const [role, setRole] = useState<Role>('member')
  const [department, setDepartment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  useEffect(() => {
    if (user) { setRole(user.role); setDepartment(user.department || '') }
  }, [user])

  if (!user) return null

  const roleChanged = role !== user.role
  const deptChanged = department !== (user.department || '')

  const handleSave = () => {
    setShowSaveConfirm(true)
  }

  const handleConfirmedSave = async () => {
    setIsSubmitting(true)
    try {
      if (roleChanged) await updateUserRole(user.id, role, user.name)
      if (deptChanged) await updateUserDept(user.id, department, user.name)
      toast.success(`${user.name}'s profile updated`)
      setShowSaveConfirm(false)
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
      setShowSaveConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Build dynamic confirm props
  let confirmTitle = 'Save User Changes?'
  let confirmMessage = `Save changes for ${user.name}?`
  let confirmLabel = 'Save All Changes'

  if (roleChanged && deptChanged) {
    confirmTitle = 'Save User Changes?'
    confirmMessage = `Update ${user.name}: role will change to ${role} and department to ${department || 'none'}. Their access and permissions will update immediately.`
    confirmLabel = 'Save All Changes'
  } else if (roleChanged) {
    confirmTitle = 'Change User Role?'
    confirmMessage = `Change ${user.name}'s role from ${user.role} to ${role}? Their dashboard access and permissions will update immediately after they next refresh.`
    confirmLabel = 'Yes, Change Role'
  } else if (deptChanged) {
    confirmTitle = 'Change Department?'
    confirmMessage = `Move ${user.name} from ${user.department || 'no department'} to ${department || 'none'}? Their project and task access will change immediately. They may be removed from projects outside ${department || 'their new department'}.`
    confirmLabel = 'Yes, Move Department'
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Edit User — ${user.name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Role</label>
            <RoleDropdown
              value={role} onChange={setRole}
              showConfirm={true} currentUserName={user.name} originalValue={user.role}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Department</label>
            <DepartmentDropdown
              value={department} onChange={setDepartment}
              showConfirm={true} currentUserName={user.name} originalValue={user.department || ''}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70">
              {isSubmitting && <LoadingSpinner size="sm" color="white" />} Save Changes
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleConfirmedSave}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        variant="warning"
        isLoading={isSubmitting}
      />
    </>
  )
}
