import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useDepartments } from '../../hooks/useDepartments'
import { useTeam } from '../../hooks/useTeam'
import { CreateDepartmentModal } from '../../modals/CreateDepartmentModal'
import { DeleteDepartmentModal } from '../../modals/DeleteDepartmentModal'
import type { Department } from '../../types'

export function DepartmentsTab() {
  const { departments, loading } = useDepartments()
  const { members } = useTeam()
  const [showCreate, setShowCreate] = useState(false)
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [deleteDept, setDeleteDept] = useState<Department | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--ink-900)]">Departments</h2>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors">
          <Plus size={14} /> New Department
        </button>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-[var(--r-sm)]" />)}</div>
        ) : departments.length === 0 ? (
          <p className="text-center text-sm text-[var(--ink-400)] py-8">No departments yet</p>
        ) : (
          <ul className="divide-y divide-[var(--line-1)]">
            {departments.map(dept => {
              const deptMembers = members.filter(m => m.department === dept.name)
              const lead = deptMembers.find(m => m.role === 'teamLead')
              return (
                <li key={dept.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[var(--ink-900)]">{dept.name}</span>
                    <span className="text-xs text-[var(--ink-400)] ml-3">{deptMembers.length} member{deptMembers.length !== 1 ? 's' : ''}</span>
                    {lead && <span className="text-xs text-[var(--ink-400)] ml-3">Lead: {lead.name}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditDept(dept)}
                      className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteDept(dept)}
                      className="p-1.5 text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 rounded-[var(--r-sm)] transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <CreateDepartmentModal open={showCreate} onClose={() => setShowCreate(false)} />
      <CreateDepartmentModal open={!!editDept} onClose={() => setEditDept(null)} department={editDept} />
      <DeleteDepartmentModal open={!!deleteDept} onClose={() => setDeleteDept(null)} department={deleteDept} />
    </div>
  )
}
