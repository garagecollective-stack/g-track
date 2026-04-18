import { useState } from 'react'
import { ChevronDown, ChevronRight, Users, User } from 'lucide-react'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { Avatar } from '../../shared/Avatar'
import type { Profile } from '../../types'

const ROLE_COLOR: Record<string, string> = {
  director: 'border-[var(--primary)] bg-[var(--primary-50)]',
  teamLead: 'border-purple-300 bg-purple-50',
  member:   'border-blue-200 bg-blue-50',
}
const ROLE_TEXT: Record<string, string> = {
  director: 'text-[var(--primary)]',
  teamLead: 'text-purple-700',
  member:   'text-blue-700',
}
const ROLE_LABEL: Record<string, string> = {
  director: 'Director',
  teamLead: 'Team Lead',
  member:   'Member',
}

// Recursive node component
function HierarchyNode({ user, allUsers, level = 0 }: { user: Profile; allUsers: Profile[]; level?: number }) {
  const [open, setOpen] = useState(level < 2)
  const reports = allUsers.filter(u => u.manager_id === user.id)
  const hasReports = reports.length > 0

  return (
    <div className={level > 0 ? 'ml-6 pl-4 border-l-2 border-[var(--line-1)] mt-2' : ''}>
      <div className={`flex items-center gap-3 p-3 rounded-[var(--r-lg)] border ${ROLE_COLOR[user.role] || 'border-[var(--line-1)] bg-[var(--surface-2)]'} transition-colors`}>
        {hasReports ? (
          <button onClick={() => setOpen(o => !o)}
            className="p-0.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] shrink-0">
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}
        <Avatar name={user.name} size="sm" imageUrl={user.avatar_url} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--ink-900)] truncate">{user.name}</p>
          <p className="text-xs text-[var(--ink-500)] truncate">{user.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[11px] font-semibold ${ROLE_TEXT[user.role] || 'text-[var(--ink-500)]'}`}>
            {ROLE_LABEL[user.role] || user.role}
          </span>
          {user.department && (
            <span className="text-[11px] text-[var(--ink-400)]">{user.department}</span>
          )}
        </div>
        {hasReports && (
          <span className="text-[11px] font-medium bg-[var(--surface-1)] border border-[var(--line-1)] text-[var(--ink-500)] px-2 py-0.5 rounded-full shrink-0">
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {open && hasReports && (
        <div className="mt-1">
          {reports.map(r => (
            <HierarchyNode key={r.id} user={r} allUsers={allUsers} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminHierarchyPage() {
  const { users, loading } = useAdminUsers()
  const [view, setView] = useState<'tree' | 'flat'>('tree')

  const filtered = users.filter(u => u.role !== 'super_admin')

  // Tree view: roots are users with no manager (or manager not in org)
  const roots = filtered.filter(u => !u.manager_id || !filtered.find(m => m.id === u.manager_id))

  const totalByRole = {
    director: filtered.filter(u => u.role === 'director').length,
    teamLead: filtered.filter(u => u.role === 'teamLead').length,
    member:   filtered.filter(u => u.role === 'member').length,
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--ink-900)]" style={{ letterSpacing: '-0.5px' }}>Hierarchy</h1>
          <p className="text-sm text-[var(--ink-500)] mt-1">Org chart and reporting structure</p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-[var(--r-lg)] p-1">
          {(['tree', 'flat'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-medium rounded-[var(--r-sm)] transition-colors capitalize ${
                view === v ? 'bg-[var(--surface-1)] text-[var(--ink-900)] shadow-[var(--shadow-xs)]' : 'text-[var(--ink-500)] hover:text-[var(--ink-700)]'
              }`}>
              {v === 'tree' ? 'Org Tree' : 'By Role'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(totalByRole).map(([role, count]) => (
          <span key={role} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${ROLE_COLOR[role] || ''} ${ROLE_TEXT[role] || ''}`}>
            <Users size={11} />
            {count} {ROLE_LABEL[role]}{count !== 1 ? 's' : ''}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-[var(--surface-2)] rounded-[var(--r-lg)] animate-pulse" />)}
        </div>
      ) : view === 'tree' ? (
        /* ── Tree View ── */
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-5 shadow-sm">
          {roots.length === 0 ? (
            <div className="text-center py-12">
              <Users size={36} className="mx-auto text-[var(--ink-400)] mb-3" />
              <p className="text-sm text-[var(--ink-400)]">No hierarchy data. Assign managers to users to build the org tree.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roots.map(u => (
                <HierarchyNode key={u.id} user={u} allUsers={filtered} level={0} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Flat / By Role View ── */
        <div className="space-y-6">
          {(['director', 'teamLead', 'member'] as const).map(role => {
            const roleUsers = filtered.filter(u => u.role === role)
            if (roleUsers.length === 0) return null
            return (
              <div key={role} className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl shadow-sm overflow-hidden">
                <div className={`px-5 py-3 border-b border-[var(--line-1)] flex items-center gap-2`}>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLOR[role]} ${ROLE_TEXT[role]}`}>
                    {ROLE_LABEL[role]}s
                  </span>
                  <span className="text-xs text-[var(--ink-400)]">{roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-[var(--line-1)]">
                  {roleUsers.map(u => {
                    const manager = filtered.find(m => m.id === u.manager_id)
                    const reportCount = filtered.filter(m => m.manager_id === u.id).length
                    return (
                      <div key={u.id} className={`flex items-center gap-3 px-5 py-3 ${!u.is_active ? 'opacity-50' : ''}`}>
                        <Avatar name={u.name} size="sm" imageUrl={u.avatar_url} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--ink-900)] truncate">{u.name}</p>
                          <p className="text-xs text-[var(--ink-400)] truncate">{u.department || '—'}</p>
                        </div>
                        {manager && (
                          <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--ink-400)]">
                            <User size={11} /> {manager.name}
                          </div>
                        )}
                        {reportCount > 0 && (
                          <span className="text-[11px] font-medium bg-[var(--surface-2)] text-[var(--ink-500)] px-2 py-0.5 rounded-full">
                            {reportCount} report{reportCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {!u.is_active && (
                          <span className="text-[11px] bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
