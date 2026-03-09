import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useDepartments } from '../hooks/useDepartments'
import { useTeam } from '../hooks/useTeam'
import { useProjects } from '../hooks/useProjects'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import type { Department } from '../types'

interface Props { open: boolean; onClose: () => void; department: Department | null }

export function DeleteDepartmentModal({ open, onClose, department }: Props) {
  const { deleteDepartment } = useDepartments()
  const { members } = useTeam()
  const { projects } = useProjects()
  const toast = useToast()
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  if (!department) return null

  const deptMembers = members.filter(m => m.department === department.name).length
  const deptProjects = projects.filter(p => p.department === department.name).length
  const canDelete = typed === department.name && deptProjects === 0

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteDepartment(department.id, department.name)
      toast.success('Department deleted')
      setTyped('')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete Department" size="sm">
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          This department has <strong>{deptProjects} project{deptProjects !== 1 ? 's' : ''}</strong> and <strong>{deptMembers} member{deptMembers !== 1 ? 's' : ''}</strong>.
        </div>
        {deptProjects > 0 ? (
          <p className="text-sm text-red-600">Archive or reassign all projects first before deleting this department.</p>
        ) : (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Type <span className="font-mono font-semibold">"{department.name}"</span> to confirm
            </label>
            <input type="text" value={typed} onChange={e => setTyped(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder={department.name} />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={!canDelete || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:pointer-events-none">
            {loading && <LoadingSpinner size="sm" color="white" />} Delete
          </button>
        </div>
      </div>
    </Modal>
  )
}
