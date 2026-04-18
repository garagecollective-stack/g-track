import { useState, useEffect } from 'react'
import { Plus, X, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import { useTeam } from '../../hooks/useTeam'
import { useToast } from '../../hooks/useToast'
import { Avatar } from '../../shared/Avatar'
import { RoleBadge } from '../../shared/Badge'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { friendlyError } from '../../utils/helpers'
import type { Profile } from '../../types'

interface Props { projectId: string; department?: string }

interface ProjectMemberRow {
  user: Profile | Profile[]
}

export function ProjectMembers({ projectId }: Props) {
  const { currentUser } = useApp()
  const { members: allMembers } = useTeam()
  const toast = useToast()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingAdd, setPendingAdd] = useState<Profile | null>(null)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  const canEdit = currentUser?.role !== 'member'

  const fetchMembers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('project_members')
      .select('user:profiles(*)')
      .eq('project_id', projectId)
    setMembers(((data || []) as unknown as ProjectMemberRow[]).flatMap((d) => Array.isArray(d.user) ? d.user : [d.user]))
    setLoading(false)
  }

  useEffect(() => {
    void fetchMembers()
  }, [projectId])

  const doAddMember = async () => {
    if (!pendingAdd) return
    const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: pendingAdd.id })
    if (error) { toast.error(friendlyError(error)); return }
    toast.success('Member added')
    setSearch('')
    setShowAdd(false)
    void fetchMembers()
  }

  const doRemoveMember = async () => {
    if (!pendingRemoveId) return
    await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', pendingRemoveId)
    toast.success('Member removed')
    void fetchMembers()
  }

  const pendingRemoveName = members.find(m => m.id === pendingRemoveId)?.name

  const eligible = allMembers.filter(m =>
    !members.find(pm => pm.id === m.id) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow">— Roster</span>
            <h3 className="text-[15px] font-semibold text-[var(--ink-900)] mt-0.5 font-display tracking-[-0.01em]">
              Project Members <span className="text-[var(--ink-400)] font-mono tabular-nums font-normal">({members.length})</span>
            </h3>
          </div>
          {canEdit && (
            <button onClick={() => setShowAdd(!showAdd)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[var(--primary)] bg-[var(--primary-50)] rounded-[var(--r-sm)] hover:bg-[var(--primary-100)] ring-1 ring-inset ring-[var(--primary-200)] transition-colors">
              <Plus size={14} strokeWidth={1.8} /> {showAdd ? 'Close' : 'Add Member'}
            </button>
          )}
        </div>

        {showAdd && (
          <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-4 shadow-[var(--shadow-xs)] animate-reveal-up">
            <div className="relative">
              <Search size={14} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] pl-9 pr-3 py-2 text-[13px] bg-[var(--surface-1)] text-[var(--ink-900)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors"
              />
            </div>
            <div className="mt-2 max-h-52 overflow-y-auto">
              {eligible.slice(0, 10).map(m => (
                <button key={m.id} onClick={() => setPendingAdd(m)}
                  className="w-full flex items-center gap-3 py-2 px-2 text-left hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
                  <Avatar name={m.name} size="sm" imageUrl={m.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--ink-900)] truncate">{m.name}</p>
                    <p className="text-[11px] text-[var(--ink-400)] truncate">{m.department}</p>
                  </div>
                  <RoleBadge role={m.role} />
                </button>
              ))}
              {eligible.length === 0 && <p className="text-[13px] text-[var(--ink-400)] py-3 text-center">No members found</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-[var(--r-md)]" />)
          ) : members.length === 0 ? (
            <div className="col-span-full text-center text-[13px] text-[var(--ink-400)] py-10">No members yet</div>
          ) : members.map(m => (
            <div key={m.id} className="group bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-md)] p-4 flex items-center gap-3 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:border-[var(--line-2)] transition-all">
              <Avatar name={m.name} size="md" status={m.user_status} imageUrl={m.avatar_url} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--ink-900)] truncate">{m.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <RoleBadge role={m.role} />
                </div>
                <p className="text-[11px] text-[var(--ink-400)] mt-1 truncate">{m.department}</p>
              </div>
              {canEdit && m.id !== currentUser?.id && (
                <button onClick={() => setPendingRemoveId(m.id)} className="p-1.5 text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-[var(--r-xs)] transition-colors shrink-0 opacity-0 group-hover:opacity-100" aria-label="Remove member">
                  <X size={14} strokeWidth={1.8} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingAdd}
        onClose={() => setPendingAdd(null)}
        onConfirm={doAddMember}
        title="Add Member"
        description={`Add ${pendingAdd?.name} to this project?`}
        confirmLabel="Add Member"
        variant="confirm"
      />

      <ConfirmDialog
        open={!!pendingRemoveId}
        onClose={() => setPendingRemoveId(null)}
        onConfirm={doRemoveMember}
        title="Remove Member"
        description={`Remove ${pendingRemoveName} from this project?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </>
  )
}
