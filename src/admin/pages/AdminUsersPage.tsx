import { useState, useMemo } from 'react'
import {
  Plus, Search, MoreVertical, UserCheck, UserX, Trash2,
  Pencil, X,
} from 'lucide-react'
import { useAdminUsers } from '../hooks/useAdminUsers'
import type { AdminUserPayload } from '../hooks/useAdminUsers'
import { useAdminDepts } from '../hooks/useAdminDepts'
import { Avatar } from '../../shared/Avatar'
import { timeAgo } from '../../utils/helpers'
import type { Profile, Role } from '../../types'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'director', label: 'Director'  },
  { value: 'teamLead', label: 'Team Lead' },
  { value: 'member',   label: 'Member'    },
]

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  director:    'bg-[var(--primary-50)] text-[var(--primary)]',
  teamLead:    'bg-purple-100 text-purple-700',
  member:      'bg-blue-100 text-blue-700',
}
const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  director:    'Director',
  teamLead:    'Team Lead',
  member:      'Member',
}

// ── Create / Edit User Modal ───────────────────────────────────────
interface UserFormProps {
  onClose: () => void
  onSave: (data: AdminUserPayload | Partial<Profile>) => Promise<void>
  initial?: Profile | null
  users: Profile[]
  depts: { id: string; name: string }[]
  mode: 'create' | 'edit'
}

function UserFormModal({ onClose, onSave, initial, users, depts, mode }: UserFormProps) {
  const [name,       setName]       = useState(initial?.name       || '')
  const [email,      setEmail]      = useState(initial?.email      || '')
  const [role,       setRole]       = useState<Role>(initial?.role === 'super_admin' ? 'member' : (initial?.role || 'member'))
  const [dept,       setDept]       = useState(initial?.department  || '')
  const [managerIds,   setManagerIds]   = useState<string[]>(initial?.manager_ids || [])
  const [managerTab,   setManagerTab]   = useState<'director' | 'teamLead'>('director')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const reportCandidates = users.filter(u => u.role === managerTab && u.id !== initial?.id)

  const toggleManager = (id: string) =>
    setManagerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // resolve names for selected ids across both director + teamLead pools
  const selectedNames = managerIds
    .map(id => users.find(u => u.id === id)?.name)
    .filter((n): n is string => !!n)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (mode === 'create') {
        await onSave({ name, email, role, department: dept, manager_ids: managerIds } as AdminUserPayload)
      } else {
        await onSave({ name, role, department: dept, manager_ids: managerIds })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[var(--surface-1)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-1)]">
          <h2 className="text-base font-bold text-[var(--ink-900)]">{mode === 'create' ? 'Invite User' : 'Edit User'}</h2>
          <button onClick={onClose} className="p-2.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={17} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                placeholder="Jane Smith" />
            </div>
            {mode === 'create' && (
              <>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                    placeholder="jane@garagecollective.io" />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)}
                className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--surface-1)]">
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Department</label>
              <select value={dept} onChange={e => setDept(e.target.value)}
                className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--surface-1)]">
                <option value="">— None —</option>
                {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--ink-700)]">Reports To</label>
                {managerIds.length > 0 && (
                  <span className="text-[11px] text-[var(--primary)] font-semibold">{managerIds.length} selected</span>
                )}
              </div>

              {/* Selected chips */}
              {selectedNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {managerIds.map(id => {
                    const u = users.find(x => x.id === id)
                    if (!u) return null
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary-50)] text-[var(--primary)] text-xs font-medium rounded-full">
                        {u.name}
                        <button type="button" onClick={() => toggleManager(id)} className="hover:text-red-500 leading-none">&times;</button>
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Tab toggle */}
              <div className="flex gap-1 p-1 bg-[var(--surface-2)] rounded-[var(--r-lg)] mb-2">
                {(['director', 'teamLead'] as const).map(tab => (
                  <button key={tab} type="button"
                    onClick={() => setManagerTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-[var(--r-sm)] transition-colors ${
                      managerTab === tab
                        ? 'bg-[var(--surface-1)] text-[var(--ink-900)] shadow-[var(--shadow-xs)]'
                        : 'text-[var(--ink-500)] hover:text-[var(--ink-700)]'
                    }`}>
                    {tab === 'director' ? 'Directors' : 'Team Leads'}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-y-auto max-h-32 divide-y divide-[var(--line-1)]">
                {reportCandidates.length === 0 ? (
                  <p className="px-3 py-2.5 text-sm text-[var(--ink-400)]">
                    No {managerTab === 'director' ? 'directors' : 'team leads'} available
                  </p>
                ) : reportCandidates.map(u => (
                  <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--surface-2)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={managerIds.includes(u.id)}
                      onChange={() => toggleManager(u.id)}
                      className="rounded border-[var(--line-2)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--ink-700)]">{u.name}</span>
                    <span className="ml-auto text-[11px] text-[var(--ink-400)]">{u.department || '—'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-[var(--r-lg)] p-3">{error}</p>}
          {mode === 'create' && (
            <p className="text-xs text-[var(--ink-500)] bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-3">
              The invite email is generated server-side. The admin UI never handles another user's password.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-lg)] hover:bg-[var(--surface-2)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-[var(--r-lg)] hover:bg-[var(--primary-700)] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : mode === 'create' ? 'Send Invite' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export function AdminUsersPage() {
  const { users, loading, fetchError, createUser, updateUser, deleteUser, toggleActive } = useAdminUsers()
  const { depts } = useAdminDepts()
  const [search, setSearch]     = useState('')
  const [roleF, setRoleF]       = useState('')
  const [statusF, setStatusF]   = useState('')
  const [deptF, setDeptF]       = useState('')
  const [menuId, setMenuId]     = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null)

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (u.role === 'super_admin') return false
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
      if (roleF && u.role !== roleF) return false
      if (deptF && u.department !== deptF) return false
      if (statusF === 'active' && !u.is_active) return false
      if (statusF === 'inactive' && u.is_active) return false
      return true
    })
  }, [users, search, roleF, deptF, statusF])

  const deptNames = [...new Set(users.map(u => u.department).filter(Boolean))] as string[]

  return (
    <div className="px-4 py-4 md:px-8 md:py-5 xl:py-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--ink-900)]" style={{ letterSpacing: '-0.5px' }}>Users</h1>
          <p className="text-sm text-[var(--ink-500)] mt-1">{users.filter(u => u.role !== 'super_admin').length} total users</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-[var(--r-lg)] hover:bg-[var(--primary-700)] transition-colors shadow-sm">
          <Plus size={16} /> Invite User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative w-full sm:flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] border border-[var(--line-1)] rounded-[var(--r-lg)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 bg-[var(--surface-1)]" />
        </div>
        <select value={roleF} onChange={e => setRoleF(e.target.value)}
          className="text-sm border border-[var(--line-1)] rounded-[var(--r-lg)] px-3 py-2 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none focus:border-[var(--primary)]">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={deptF} onChange={e => setDeptF(e.target.value)}
          className="text-sm border border-[var(--line-1)] rounded-[var(--r-lg)] px-3 py-2 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none focus:border-[var(--primary)]">
          <option value="">All Depts</option>
          {deptNames.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="text-sm border border-[var(--line-1)] rounded-[var(--r-lg)] px-3 py-2 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none focus:border-[var(--primary)]">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl shadow-sm">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface-2)] border-b border-[var(--line-1)]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wider hidden md:table-cell">Department</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wider hidden lg:table-cell">Manager</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wider hidden lg:table-cell">Last Active</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-[var(--ink-400)]">Loading users…</td></tr>
              ) : fetchError ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <p className="text-sm font-medium text-red-500">Failed to load users</p>
                  <p className="text-xs text-[var(--ink-400)] mt-1 font-mono">{fetchError}</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-[var(--ink-400)]">No users found</td></tr>
              ) : filtered.map(user => {
                const managerNames = (user.manager_ids || [])
                  .map(mid => users.find(u => u.id === mid)?.name)
                  .filter((n): n is string => !!n)
                return (
                  <tr key={user.id}
                    className={`border-b border-[var(--line-1)] hover:bg-[var(--surface-2)] transition-colors ${!user.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" imageUrl={user.avatar_url} />
                        <div>
                          <p className={`text-sm font-semibold text-[var(--ink-900)] ${!user.is_active ? 'line-through' : ''}`}>{user.name}</p>
                          <p className="text-xs text-[var(--ink-400)]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role] || 'bg-[var(--surface-2)] text-[var(--ink-700)]'}`}>
                        {ROLE_LABEL[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-[var(--ink-700)]">{user.department || <span className="text-[var(--ink-400)]">—</span>}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-[var(--ink-700)]">{managerNames.length ? managerNames.join(', ') : <span className="text-[var(--ink-400)]">—</span>}</span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-[var(--ink-400)]">
                      {user.last_seen ? timeAgo(user.last_seen) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button onClick={() => setMenuId(menuId === user.id ? null : user.id)}
                          className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
                          <MoreVertical size={15} />
                        </button>
                        {menuId === user.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] shadow-lg z-20 py-1 overflow-hidden">
                              <button onClick={() => { setEditUser(user); setMenuId(null) }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--ink-700)] hover:bg-[var(--surface-2)]">
                                <Pencil size={13} className="text-[var(--ink-400)]" /> Edit User
                              </button>
                              <div className="border-t border-[var(--line-1)] my-1" />
                              {user.is_active ? (
                                <button onClick={() => { toggleActive(user.id, false); setMenuId(null) }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-orange-500 hover:bg-orange-50">
                                  <UserX size={13} /> Deactivate
                                </button>
                              ) : (
                                <button onClick={() => { toggleActive(user.id, true); setMenuId(null) }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-green-600 hover:bg-green-50">
                                  <UserCheck size={13} /> Reactivate
                                </button>
                              )}
                              <button onClick={() => { setConfirmDelete(user); setMenuId(null) }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                                <Trash2 size={13} /> Delete User
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <UserFormModal
          mode="create"
          users={users}
          depts={depts}
          onClose={() => setShowCreate(false)}
          onSave={data => createUser(data as AdminUserPayload)}
        />
      )}

      {/* Edit Modal */}
      {editUser && (
        <UserFormModal
          mode="edit"
          initial={editUser}
          users={users}
          depts={depts}
          onClose={() => setEditUser(null)}
          onSave={data => updateUser(editUser.id, data as Partial<Profile>)}
        />
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="bg-[var(--surface-1)] rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-[var(--ink-900)] mb-2">Delete {confirmDelete.name}?</h3>
            <p className="text-sm text-[var(--ink-500)] mb-5">This will permanently remove the user and all their data. This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 text-sm font-medium text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-lg)] hover:bg-[var(--surface-2)]">
                Cancel
              </button>
              <button onClick={() => { deleteUser(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-[var(--r-lg)] hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-outside */}
      {menuId && <div className="fixed inset-0 z-0" onClick={() => setMenuId(null)} />}
    </div>
  )
}
