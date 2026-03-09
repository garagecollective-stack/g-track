import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useTeam } from '../../hooks/useTeam'
import { useTasks } from '../../hooks/useTasks'
import { Avatar } from '../../shared/Avatar'
import { RoleBadge } from '../../shared/Badge'
import { ProgressBar } from '../../shared/ProgressBar'
import { MemberDetailDrawer } from '../../modals/MemberDetailDrawer'
import { getDeptColor } from '../../utils/helpers'
import type { Profile } from '../../types'

export function TeamPage() {
  const { currentUser } = useApp()
  const { members, loading } = useTeam()
  const { tasks } = useTasks()
  const [selected, setSelected] = useState<Profile | null>(null)

  const isDirector = currentUser?.role === 'director'

  const getDeptMembers = (dept: string) =>
    members.filter(m => m.department === dept)

  const depts = isDirector
    ? [...new Set(members.map(m => m.department).filter(Boolean))]
    : [currentUser?.department]

  const getTaskCounts = (userId: string) => ({
    todo: tasks.filter(t => t.assignee_id === userId && t.status === 'backlog').length,
    active: tasks.filter(t => t.assignee_id === userId && t.status === 'inProgress').length,
    done: tasks.filter(t => t.assignee_id === userId && t.status === 'done').length,
  })

  const title = isDirector ? 'Garage Collective' : `Your ${currentUser?.department} Team`

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.5px' }}>Team</h1>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-52 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {depts.filter(Boolean).map(dept => {
            const deptMembers = getDeptMembers(dept!)
            if (!isDirector && deptMembers.length === 0) return null
            const color = getDeptColor(dept!)

            return (
              <div key={dept}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold text-gray-700">{dept}</span>
                  <span className="text-sm text-gray-400">{deptMembers.length} {deptMembers.length === 1 ? 'person' : 'people'}</span>
                  <div className="flex-1 h-px bg-gray-100 ml-2" />
                </div>

                {/* Member cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deptMembers.map(member => {
                    const counts = getTaskCounts(member.id)
                    const total = counts.todo + counts.active + counts.done
                    const completion = total > 0 ? Math.round((counts.done / total) * 100) : 0

                    return (
                      <div
                        key={member.id}
                        onClick={() => setSelected(member)}
                        className="bg-white border border-gray-100 rounded-xl p-5 text-center cursor-pointer hover:border-[#0A5540]/30 hover:shadow-sm transition-all"
                      >
                        <div className="flex justify-center mb-3">
                          <Avatar name={member.name} size="lg" status={member.user_status} imageUrl={member.avatar_url} />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">{member.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{member.email}</p>
                        <div className="mt-2"><RoleBadge role={member.role} /></div>

                        <div className="grid grid-cols-3 gap-2 mt-4 border-t border-gray-100 pt-3">
                          {[
                            { label: 'To Do', value: counts.todo },
                            { label: 'Active', value: counts.active },
                            { label: 'Done', value: counts.done },
                          ].map(s => (
                            <div key={s.label}>
                              <p className="text-base font-bold text-gray-900" style={{ fontFamily: 'DM Mono' }}>{s.value}</p>
                              <p className="text-[11px] text-gray-400">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between mb-1">
                            <span className="text-[11px] text-gray-400">Completion</span>
                            <span className="text-[11px] font-medium text-gray-600" style={{ fontFamily: 'DM Mono' }}>{completion}%</span>
                          </div>
                          <ProgressBar value={completion} size="sm" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <MemberDetailDrawer member={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
