import { useState, useEffect } from 'react'
import { X, Check, FolderOpen, Calendar, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useTasks } from '../hooks/useTasks'
import { Avatar } from '../shared/Avatar'
import { RoleBadge, DeptBadge } from '../shared/Badge'
import { StatusBadge } from '../shared/StatusBadge'
import { ProgressBar } from '../shared/ProgressBar'
import { BulkReassignModal } from './BulkReassignModal'
import { isOverdue, formatDateShort } from '../utils/helpers'
import type { Profile, Project } from '../types'

interface Props {
  member: Profile | null
  onClose: () => void
  allMembers?: Profile[]
}

type Tab = 'overview' | 'todos'

function TodoReadOnlyRow({ todo }: { todo: any }) {
  const done = todo.status === 'completed'
  const overdue = !done && todo.due_date && new Date(todo.due_date) < new Date()

  return (
    <div className={`px-4 py-3 border-b border-[var(--line-1)] last:border-0 ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
          done ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--line-2)]'
        }`}>
          {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${done ? 'line-through text-[var(--ink-400)]' : 'text-[var(--ink-900)]'}`}>
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-xs text-[var(--ink-400)] mt-0.5 truncate">{todo.description}</p>
          )}
          {todo.project_name && (
            <p className="text-xs text-[var(--ink-400)] mt-0.5 flex items-center gap-1">
              <FolderOpen className="w-3 h-3 shrink-0" />
              {todo.project_name}
            </p>
          )}
          {todo.notes && (
            <p className="text-xs text-[var(--ink-500)] mt-1.5 bg-[var(--surface-2)] rounded-[var(--r-sm)] px-2 py-1.5 leading-relaxed">
              📝 {todo.notes}
            </p>
          )}
          {todo.due_date && (
            <p className={`flex items-center gap-1 text-xs mt-1 ${overdue ? 'text-red-500 font-medium' : 'text-[var(--ink-400)]'}`}>
              <Calendar className="w-3 h-3 shrink-0" />
              {overdue ? 'Overdue · ' : ''}{formatDateShort(todo.due_date)}
            </p>
          )}
          {todo.has_issue && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 mt-1">
              <AlertTriangle className="w-3 h-3" /> Has Issue
            </span>
          )}
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
          done ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
        }`}>
          {done ? 'Done' : 'Pending'}
        </span>
      </div>
    </div>
  )
}

export function MemberDetailDrawer({ member, onClose, allMembers = [] }: Props) {
  const { currentUser } = useApp()
  const { tasks, bulkReassign } = useTasks({ assigneeId: member?.id })
  const [projects, setProjects] = useState<Project[]>([])
  const [taskFilter, setTaskFilter] = useState('')
  const [showReassign, setShowReassign] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [memberTodos, setMemberTodos] = useState<any[]>([])
  const [loadingTodos, setLoadingTodos] = useState(false)

  const canReassign = currentUser?.role !== 'member'
  const isTeamLead = member?.role === 'teamLead'

  useEffect(() => {
    if (member) {
      setActiveTab('overview')
      setMemberTodos([])
      fetchProjects()
    }
  }, [member?.id])

  useEffect(() => {
    if (activeTab !== 'todos' || !isTeamLead || !member?.id) return
    setLoadingTodos(true)
    supabase
      .from('personal_todos')
      .select('id, title, description, status, due_date, notes, project_id, project_name, has_issue, created_at')
      .eq('user_id', member.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMemberTodos(data || [])
        setLoadingTodos(false)
      })
  }, [activeTab, member?.id, isTeamLead])

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

  const pendingTodos = memberTodos.filter(t => t.status !== 'completed')
  const completedTodos = memberTodos.filter(t => t.status === 'completed')

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 w-full md:w-[420px] bg-[var(--surface-1)] border-l border-[var(--line-1)] shadow-xl flex flex-col" style={{ height: '100dvh' }}>
        {/* Header + tabs */}
        <div className="p-5 pb-0 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={18} />
          </button>

          <div className="flex items-start gap-4 mb-4 pr-8">
            <Avatar name={member.name} size="xl" status={member.user_status} imageUrl={member.avatar_url} />
            <div>
              <h2 className="text-lg font-bold text-[var(--ink-900)]">{member.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={member.role} />
                {member.department && <DeptBadge department={member.department} />}
              </div>
              <p className="text-sm text-[var(--ink-500)] mt-1">{member.email}</p>
            </div>
          </div>

          <div className="flex border-b border-[var(--line-1)]">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'overview'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--ink-400)] hover:text-[var(--ink-700)]'
              }`}
            >
              Overview
            </button>
            {isTeamLead && (
              <button
                type="button"
                onClick={() => setActiveTab('todos')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === 'todos'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--ink-400)] hover:text-[var(--ink-700)]'
                }`}
              >
                To-Dos
                {memberTodos.length > 0 && (
                  <span className="ml-2 text-xs bg-[var(--surface-2)] text-[var(--ink-500)] rounded-full px-2 py-0.5">
                    {pendingTodos.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="p-5 space-y-5">
              {member.role !== 'director' && (member.manager_ids?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--ink-400)] uppercase tracking-wide mb-2">Reporting To</p>
                  <div className="flex flex-wrap gap-2">
                    {(member.manager_ids || []).map(mid => {
                      const mgr = allMembers.find(m => m.id === mid)
                      if (!mgr) return null
                      return (
                        <div key={mid} className="flex items-center gap-2 bg-[var(--primary-50)] rounded-[var(--r-sm)] px-2.5 py-1.5">
                          <Avatar name={mgr.name} size="xs" imageUrl={mgr.avatar_url} />
                          <span className="text-xs font-medium text-[var(--primary)]">{mgr.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'To Do',   value: todo,    color: 'text-orange-500' },
                  { label: 'Active',  value: active,  color: 'text-blue-500' },
                  { label: 'Done',    value: done,    color: 'text-green-500' },
                  { label: 'Overdue', value: overdue, color: 'text-red-500' },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--surface-2)] rounded-[var(--r-lg)] p-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`} style={{ fontFamily: 'IBM Plex Mono' }}>{s.value}</p>
                    <p className="text-[11px] text-[var(--ink-500)] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--ink-900)]">Assigned Tasks</h3>
                  <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)}
                    className="text-xs border border-[var(--line-1)] rounded-[var(--r-sm)] px-2 py-1 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none">
                    <option value="">All Status</option>
                    <option value="backlog">Backlog</option>
                    <option value="inProgress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-[var(--ink-400)] text-center py-4">No tasks</p>
                  ) : filtered.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-[var(--surface-2)] rounded-[var(--r-sm)] px-3 py-2">
                      <p className="text-sm text-[var(--ink-900)] truncate flex-1">{t.title}</p>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              </div>

              {projects.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-3">Projects</h3>
                  <div className="space-y-2">
                    {projects.map((p: any) => p && (
                      <div key={p.id} className="flex items-center gap-3 bg-[var(--surface-2)] rounded-[var(--r-sm)] px-3 py-2">
                        <span className="text-[var(--ink-400)]">📁</span>
                        <span className="text-sm text-[var(--ink-900)] flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-[var(--ink-500)]" style={{ fontFamily: 'IBM Plex Mono' }}>{p.progress}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-medium text-[var(--ink-500)] uppercase tracking-wide">Completion Rate</span>
                  <span className="text-sm font-semibold text-[var(--primary)]" style={{ fontFamily: 'IBM Plex Mono' }}>{completion}%</span>
                </div>
                <ProgressBar value={completion} />
              </div>

              {canReassign && tasks.length > 0 && (
                <button onClick={() => setShowReassign(true)}
                  className="w-full px-4 py-2.5 text-sm font-medium text-[var(--primary)] bg-[var(--surface-1)] border border-[var(--primary)]/30 rounded-[var(--r-sm)] hover:bg-[var(--primary-50)] transition-colors">
                  Reassign All Tasks
                </button>
              )}
            </div>
          )}

          {/* Todos tab — read-only for director */}
          {activeTab === 'todos' && (
            <div>
              <div className="px-5 py-3 border-b border-[var(--line-1)]">
                <p className="text-sm font-semibold text-[var(--ink-900)]">{member.name.split(' ')[0]}'s To-Dos</p>
                {!loadingTodos && (
                  <p className="text-xs text-[var(--ink-400)] mt-0.5">
                    {pendingTodos.length} pending · {completedTodos.length} completed
                  </p>
                )}
              </div>
              {loadingTodos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : memberTodos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <p className="text-sm text-[var(--ink-400)]">No todos yet</p>
                </div>
              ) : (
                <>
                  {pendingTodos.length > 0 && (
                    <>
                      <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide px-5 pt-4 pb-2">
                        Pending ({pendingTodos.length})
                      </p>
                      {pendingTodos.map(t => <TodoReadOnlyRow key={t.id} todo={t} />)}
                    </>
                  )}
                  {completedTodos.length > 0 && (
                    <>
                      <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wide px-5 pt-4 pb-2">
                        Completed ({completedTodos.length})
                      </p>
                      {completedTodos.map(t => <TodoReadOnlyRow key={t.id} todo={t} />)}
                    </>
                  )}
                </>
              )}
            </div>
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
