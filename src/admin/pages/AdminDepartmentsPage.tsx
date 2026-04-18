import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Building2, Users } from 'lucide-react'
import { useAdminDepts } from '../hooks/useAdminDepts'
import type { DeptPayload } from '../hooks/useAdminDepts'
import { useAdminUsers } from '../hooks/useAdminUsers'
import type { Department } from '../../types'

const PRESET_COLORS = [
  '#6366F1', '#EC4899', '#F97316', '#14B8A6',
  '#F59E0B', '#0A5540', '#3B82F6', '#8B5CF6',
  '#EF4444', '#10B981',
]

interface DeptFormProps {
  onClose: () => void
  onSave:  (data: DeptPayload) => Promise<void>
  initial?: Department | null
}

function DeptFormModal({ onClose, onSave, initial }: DeptFormProps) {
  const { users } = useAdminUsers()
  const [name,   setName]   = useState(initial?.name            || '')
  const [color,  setColor]  = useState(initial?.color           || '#6366F1')
  const [headId, setHeadId] = useState(initial?.department_head || '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const leads = users.filter(u => u.role === 'director' || u.role === 'teamLead')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ name, color, department_head: headId || null })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[var(--surface-1)] rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-1)]">
          <h2 className="text-base font-bold text-[var(--ink-900)]">{initial ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)]">
            <X size={17} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Department Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              placeholder="e.g. Engineering"
              className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[var(--primary)] scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 overflow-hidden"
                title="Custom color" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Department Head (optional)</label>
            <select value={headId} onChange={e => setHeadId(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--surface-1)]">
              <option value="">— None —</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.role === 'director' ? 'Director' : 'Team Lead'})</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-[var(--r-lg)] p-3">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-lg)] hover:bg-[var(--surface-2)]">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-[var(--r-lg)] hover:bg-[var(--primary-700)] disabled:opacity-50">
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export function AdminDepartmentsPage() {
  const { depts, loading, createDept, updateDept, deleteDept } = useAdminDepts()
  const { users } = useAdminUsers()
  const [showCreate, setShowCreate] = useState(false)
  const [editDept,   setEditDept]   = useState<Department | null>(null)
  const [confirmDel, setConfirmDel] = useState<Department | null>(null)
  const [delError,   setDelError]   = useState('')

  const handleDelete = async (dept: Department) => {
    setDelError('')
    try {
      await deleteDept(dept.id)
      setConfirmDel(null)
    } catch (err) {
      setDelError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--ink-900)]" style={{ letterSpacing: '-0.5px' }}>Departments</h1>
          <p className="text-sm text-[var(--ink-500)] mt-1">{depts.length} department{depts.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-[var(--r-lg)] hover:bg-[var(--primary-700)] transition-colors shadow-sm">
          <Plus size={16} /> New Department
        </button>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-[var(--surface-2)] rounded-2xl animate-pulse" />)}
        </div>
      ) : depts.length === 0 ? (
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-12 text-center">
          <Building2 size={40} className="mx-auto text-[var(--ink-400)] mb-3" />
          <p className="text-sm text-[var(--ink-400)]">No departments yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map(dept => {
            const deptUsers  = users.filter(u => u.department === dept.name && u.role !== 'super_admin')
            const head       = users.find(u => u.id === dept.department_head)
            const activeCount = deptUsers.filter(u => u.is_active).length

            return (
              <div key={dept.id} className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[var(--r-lg)] flex items-center justify-center"
                      style={{ backgroundColor: dept.color + '20' }}>
                      <Building2 size={18} style={{ color: dept.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--ink-900)]">{dept.name}</h3>
                      {head && <p className="text-xs text-[var(--ink-500)] mt-0.5">Head: {head.name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setEditDept(dept)}
                      className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { setConfirmDel(dept); setDelError('') }}
                      className="p-1.5 text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 rounded-[var(--r-sm)] transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Color swatch */}
                <div className="h-1.5 rounded-full mb-4" style={{ backgroundColor: dept.color }} />

                <div className="flex items-center gap-1.5 text-xs text-[var(--ink-500)]">
                  <Users size={12} />
                  <span>{activeCount} active member{activeCount !== 1 ? 's' : ''}</span>
                  {deptUsers.length > activeCount && (
                    <span className="text-[var(--ink-400)]">· {deptUsers.length - activeCount} inactive</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <DeptFormModal onClose={() => setShowCreate(false)} onSave={createDept} />
      )}

      {/* Edit Modal */}
      {editDept && (
        <DeptFormModal
          initial={editDept}
          onClose={() => setEditDept(null)}
          onSave={data => updateDept(editDept.id, data)}
        />
      )}

      {/* Delete Confirm */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setConfirmDel(null) }}>
          <div className="bg-[var(--surface-1)] rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-[var(--ink-900)] mb-2">Delete "{confirmDel.name}"?</h3>
            <p className="text-sm text-[var(--ink-500)] mb-4">
              Users in this department won't be deleted, but they'll lose their department assignment.
            </p>
            {delError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-[var(--r-lg)] p-3 mb-4">{delError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 text-sm font-medium text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-lg)] hover:bg-[var(--surface-2)]">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDel)}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-[var(--r-lg)] hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
