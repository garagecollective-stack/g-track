import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { RoleDropdown } from '../shared/RoleDropdown'
import { DepartmentDropdown } from '../shared/DepartmentDropdown'
import { Avatar } from '../shared/Avatar'
import { useTeam } from '../hooks/useTeam'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import type { Profile, Role } from '../types'

interface Props { open: boolean; onClose: () => void; user: Profile | null }

export function EditUserModal({ open, onClose, user }: Props) {
  const { members, updateUserRole, updateUserDept, updateUserManagers } = useTeam()
  const toast = useToast()
  const [role, setRole] = useState<Role>('member')
  const [department, setDepartment] = useState('')
  const [managerIds, setManagerIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  useEffect(() => {
    if (user) {
      setRole(user.role)
      setDepartment(user.department || '')
      setManagerIds(user.manager_ids || [])
    }
  }, [user])

  if (!user) return null

  const directors = members.filter(m => m.role === 'director' && m.id !== user.id)
  const showManagerField = role !== 'director'

  const roleChanged = role !== user.role
  const deptChanged = department !== (user.department || '')
  const managersChanged = showManagerField && (
    JSON.stringify([...(user.manager_ids || [])].sort()) !== JSON.stringify([...managerIds].sort())
  )
  const hasChanges = roleChanged || deptChanged || managersChanged

  const toggleManager = (id: string) => {
    setManagerIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const handleSave = () => {
    if (!hasChanges) { onClose(); return }
    setShowSaveConfirm(true)
  }

  const handleConfirmedSave = async () => {
    setIsSubmitting(true)
    try {
      if (roleChanged) await updateUserRole(user.id, role, user.name)
      if (deptChanged) await updateUserDept(user.id, department, user.name)
      if (managersChanged) await updateUserManagers(user.id, managerIds, user.name)
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

  // Build dynamic confirm message
  const changes: string[] = []
  if (roleChanged) changes.push(`role → ${role}`)
  if (deptChanged) changes.push(`department → ${department || 'none'}`)
  if (managersChanged) {
    const names = managerIds.map(id => directors.find(d => d.id === id)?.name).filter(Boolean)
    changes.push(`reporting to → ${names.length ? names.join(', ') : 'none'}`)
  }
  const confirmMessage = `Update ${user.name}: ${changes.join('; ')}. Changes take effect immediately.`

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Edit User — ${user.name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Role</label>
            <RoleDropdown
              value={role} onChange={setRole}
              showConfirm={true} currentUserName={user.name} originalValue={user.role}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Department</label>
            <DepartmentDropdown
              value={department} onChange={setDepartment}
              showConfirm={true} currentUserName={user.name} originalValue={user.department || ''}
            />
          </div>

          {/* Reporting To — multi-select directors */}
          {showManagerField && (
            <div>
              <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">
                Reporting To
                <span className="ml-1.5 text-xs font-normal text-[var(--ink-400)]">(select all that apply)</span>
              </label>
              {directors.length === 0 ? (
                <p className="text-sm text-[var(--ink-400)] py-2">No directors found</p>
              ) : (
                <div className="border border-[var(--line-1)] rounded-[var(--r-sm)] overflow-hidden divide-y divide-[var(--line-1)]">
                  {directors.map(d => {
                    const selected = managerIds.includes(d.id)
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleManager(d.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          selected ? 'bg-[var(--primary-50)]' : 'bg-[var(--surface-1)] hover:bg-[var(--surface-2)]'
                        }`}
                      >
                        <Avatar name={d.name} size="sm" imageUrl={d.avatar_url} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--ink-900)] truncate">{d.name}</p>
                          {d.department && (
                            <p className="text-xs text-[var(--ink-400)] truncate">{d.department}</p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-[var(--r-xs)] border flex items-center justify-center shrink-0 transition-colors ${
                          selected
                            ? 'bg-[var(--primary)] border-[var(--primary)]'
                            : 'border-[var(--line-2)] bg-[var(--surface-1)]'
                        }`}>
                          {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Selected chips */}
              {managerIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {managerIds.map(id => {
                    const d = directors.find(m => m.id === id)
                    if (!d) return null
                    return (
                      <span key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium rounded-full">
                        {d.name}
                        <button type="button" onClick={() => toggleManager(id)}
                          className="hover:text-[var(--primary)]/60 transition-colors">
                          <X size={10} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isSubmitting || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-50">
              {isSubmitting && <LoadingSpinner size="sm" color="white" />} Save Changes
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleConfirmedSave}
        title="Save User Changes?"
        message={confirmMessage}
        confirmLabel="Save Changes"
        variant="warning"
        isLoading={isSubmitting}
      />
    </>
  )
}
