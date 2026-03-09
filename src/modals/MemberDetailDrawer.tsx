import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useTasks } from '../hooks/useTasks'
import { Avatar } from '../shared/Avatar'
import { RoleBadge, DeptBadge } from '../shared/Badge'
import { StatusBadge } from '../shared/StatusBadge'
import { ProgressBar } from '../shared/ProgressBar'
import { BulkReassignModal } from './BulkReassignModal'
import { isOverdue } from '../utils/helpers'
import type { Profile, Project } from '../types'

interface Props {
  member: Profile | null
  onClose: () => void
}

export function MemberDetailDrawer({ member, onClose }: Props) {
  const { currentUser } = useApp()
  const { tasks, bulkReassign } = useTasks({ assigneeId: member?.id })
  const [projects, setProjects] = useState<Project[]>([])
  const [taskFilter, setTaskFilter] = useState('')
  const [showReassign, setShowReassign] = useState(false)

  const canReassign = currentUser?.role !== 'member'

  useEffect(() => {
    if (member) fetchProjects()
  }, [member?.id])

  const fetchProjects = async () => {
    if (!member) return
    const { data } = await supabase
      .from('project_members')
      .select('project:projects(*)')
      .eq('user_id', member.id)
    setProjects((data || []).map((d: any) => d.project))
  }

  if (!member) return null

  const filtered = tasks.filter(t => !taskFilter || t.status === taskFilter)
  const todo = tasks.filter(t => t.status === 'backlog').length
  const active = tasks.filter(t => t.status === 'inProgress').length
  const done = tasks.filter(t => t.status === 'done').length
  const overdue = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length
  const completion = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[420px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto">
        <div className="p-5">
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>

          {/* Identity */}
          <div className="flex items-start gap-4 mb-5 pr-8">
            <Avatar name={member.name} size="xl" status={member.user_status} imageUrl={member.avatar_url} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">{member.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={member.role} />
                {member.department && <DeptBadge department={member.department} />}
              </div>
              <p className="text-sm text-gray-500 mt-1">{member.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: 'To Do', value: todo, color: 'text-orange-500' },
              { label: 'Active', value: active, color: 'text-blue-500' },
              { label: 'Done', value: done, color: 'text-green-500' },
              { label: 'Overdue', value: overdue, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`} style={{ fontFamily: 'DM Mono' }}>{s.value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tasks */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Assigned Tasks</h3>
              <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none">
                <option value="">All Status</option>
                <option value="backlog">Backlog</option>
                <option value="inProgress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No tasks</p>
              ) : filtered.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-sm text-gray-800 truncate flex-1">{t.title}</p>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          {projects.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Projects</h3>
              <div className="space-y-2">
                {projects.map((p: any) => p && (
                  <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-400">📁</span>
                    <span className="text-sm text-gray-800 flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-gray-500" style={{ fontFamily: 'DM Mono' }}>{p.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion */}
          <div className="mb-5">
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completion Rate</span>
              <span className="text-sm font-semibold text-[#0A5540]" style={{ fontFamily: 'DM Mono' }}>{completion}%</span>
            </div>
            <ProgressBar value={completion} />
          </div>

          {/* Reassign button */}
          {canReassign && tasks.length > 0 && (
            <button onClick={() => setShowReassign(true)}
              className="w-full px-4 py-2.5 text-sm font-medium text-[#0A5540] bg-white border border-[#0A5540]/30 rounded-lg hover:bg-[#edf8f4] transition-colors">
              Reassign All Tasks
            </button>
          )}
        </div>
      </div>

      <BulkReassignModal
        open={showReassign}
        onClose={() => setShowReassign(false)}
        taskIds={tasks.map(t => t.id)}
        onReassign={(assigneeId, assigneeName) => bulkReassign(tasks.map(t => t.id), assigneeId, assigneeName)}
      />
    </>
  )
}
