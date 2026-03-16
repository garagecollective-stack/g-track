import { useState, useMemo } from 'react'
import { Plus, MoreVertical } from 'lucide-react'
import { useTeam } from '../../hooks/useTeam'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'
import { Avatar } from '../../shared/Avatar'
import { RoleBadge, DeptBadge } from '../../shared/Badge'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { InviteUserModal } from '../../modals/InviteUserModal'
import { EditUserModal } from '../../modals/EditUserModal'
import { DeleteUserModal } from '../../modals/DeleteUserModal'
import { SearchInput } from '../../shared/SearchInput'
import { timeAgo, friendlyError } from '../../utils/helpers'
import type { Profile } from '../../types'
import { supabase } from '../../lib/supabase'

export function UsersTab() {
  const { members, loading, deactivateUser, reactivateUser, fetchMembers } = useTeam()
  const { currentUser } = useApp()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null)
  const [deactivatePending, setDeactivatePending] = useState<Profile | null>(null)
  const [reactivatePending, setReactivatePending] = useState<Profile | null>(null)

  const filtered = useMemo(() => members.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter && m.role !== roleFilter) return false
    if (deptFilter && m.department !== deptFilter) return false
    if (statusFilter === 'active' && !m.is_active) return false
    if (statusFilter === 'deactivated' && m.is_active) return false
    return true
  }), [members, search, roleFilter, deptFilter, statusFilter])

  const depts = [...new Set(members.map(m => m.department).filter(Boolean))]

  const handleResetPassword = async (email: string) => {
    try {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
      toast.success('Password reset email sent')
    } catch (err) {
      toast.error(friendlyError(err))
    }
    setMenuOpen(null)
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Users ({members.length})</h2>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors">
            <Plus size={14} /> Invite User
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search users..." className="flex-1 min-w-[160px]" />
          {['roleFilter', 'deptFilter', 'statusFilter'].map(__ => null)}
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none">
            <option value="">All Roles</option>
            <option value="director">Director</option>
            <option value="teamLead">Team Lead</option>
            <option value="member">Member</option>
          </select>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none">
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d!}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">No users found</td></tr>
                ) : filtered.map(user => (
                  <tr key={user.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" imageUrl={user.avatar_url} />
                        <div>
                          <p className={`text-sm font-medium text-gray-900 ${!user.is_active ? 'line-through' : ''}`}>{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-3">{user.department ? <DeptBadge department={user.department} /> : <span className="text-xs text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">
                      {!user.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Deactivated</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.user_status === 'active' ? 'bg-green-500' :
                            user.user_status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-xs text-gray-600 capitalize">{user.user_status}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{user.last_seen ? timeAgo(user.last_seen) : 'Never'}</td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical size={15} />
                        </button>
                        {menuOpen === user.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                            <button onClick={() => { setEditUser(user); setMenuOpen(null) }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit User</button>
                            <button onClick={() => handleResetPassword(user.email)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Reset Password</button>
                            <div className="border-t border-gray-100 my-1" />
                            {user.is_active ? (
                              <button onClick={() => { setDeactivatePending(user); setMenuOpen(null) }}
                                className="w-full text-left px-4 py-2 text-sm text-orange-500 hover:bg-orange-50">Deactivate</button>
                            ) : (
                              <button onClick={() => { setReactivatePending(user); setMenuOpen(null) }}
                                className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50">Reactivate</button>
                            )}
                            {user.id !== currentUser?.id && (
                              <button onClick={() => { setDeleteUser(user); setMenuOpen(null) }}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">Delete User</button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <InviteUserModal open={showInvite} onClose={() => setShowInvite(false)} onSuccess={fetchMembers} />
        <EditUserModal open={!!editUser} onClose={() => setEditUser(null)} user={editUser} />
        <DeleteUserModal open={!!deleteUser} onClose={() => setDeleteUser(null)} user={deleteUser} onSuccess={fetchMembers} />
      </div>

      <ConfirmDialog
        open={!!deactivatePending}
        onClose={() => setDeactivatePending(null)}
        onConfirm={async () => { await deactivateUser(deactivatePending!.id, deactivatePending!.name) }}
        title="Deactivate User"
        description={`Deactivate ${deactivatePending?.name}? They will lose access to G-Track.`}
        confirmLabel="Deactivate"
        variant="danger"
      />

      <ConfirmDialog
        open={!!reactivatePending}
        onClose={() => setReactivatePending(null)}
        onConfirm={async () => { await reactivateUser(reactivatePending!.id, reactivatePending!.name) }}
        title="Reactivate User"
        description={`Restore access for ${reactivatePending?.name}?`}
        confirmLabel="Reactivate"
        variant="confirm"
      />
    </>
  )
}
