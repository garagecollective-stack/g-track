import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
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

  useEffect(() => { fetchMembers() }, [projectId])

  const fetchMembers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('project_members')
      .select('user:profiles(*)')
      .eq('project_id', projectId)
    setMembers((data || []).map((d: any) => d.user))
    setLoading(false)
  }

  const doAddMember = async () => {
    if (!pendingAdd) return
    const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: pendingAdd.id })
    if (error) { toast.error(friendlyError(error)); return }
    toast.success('Member added')
    setSearch('')
    setShowAdd(false)
    fetchMembers()
  }

  const doRemoveMember = async () => {
    if (!pendingRemoveId) return
    await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', pendingRemoveId)
    toast.success('Member removed')
    fetchMembers()
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
          <h3 className="text-sm font-semibold text-gray-900">Project Members ({members.length})</h3>
          {canEdit && (
            <button onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0A5540] bg-[#edf8f4] rounded-lg hover:bg-[#d6f0e8] transition-colors">
              <Plus size={14} /> Add Member
            </button>
          )}
        </div>

        {showAdd && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0A5540]"
            />
            <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-gray-50">
              {eligible.slice(0, 10).map(m => (
                <button key={m.id} onClick={() => setPendingAdd(m)}
                  className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors">
                  <Avatar name={m.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.department}</p>
                  </div>
                  <RoleBadge role={m.role} />
                </button>
              ))}
              {eligible.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">No members found</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)
          ) : members.length === 0 ? (
            <div className="col-span-2 text-center text-sm text-gray-400 py-8">No members yet</div>
          ) : members.map(m => (
            <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
              <Avatar name={m.name} size="md" status={m.user_status} imageUrl={m.avatar_url} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <RoleBadge role={m.role} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{m.department}</p>
              </div>
              {canEdit && m.id !== currentUser?.id && (
                <button onClick={() => setPendingRemoveId(m.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                  <X size={14} />
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
