import { useState, useEffect, useMemo } from 'react'
import { Folder, CheckSquare, CheckCheck, Plus, ListTodo, AlertTriangle, AlertCircle } from 'lucide-react'
import { StatCardModal } from '../../components/dashboard/StatCardModal'
import type { Task, Project } from '../../types'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useTasks } from '../../hooks/useTasks'
import { useTeam } from '../../hooks/useTeam'
import { useIssues } from '../../hooks/useIssues'
import { Avatar } from '../../shared/Avatar'
import { ProgressBar } from '../../shared/ProgressBar'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { SkeletonCard } from '../../shared/SkeletonCard'
import { IssueDetailDrawer } from '../../modals/IssueDetailDrawer'
import { useDashboardModals } from '../../layouts/DashboardLayout'
import { TodoWidget } from '../todos/TodoWidget'
import { OverdueAlertBanner } from '../../components/OverdueAlertBanner'
import { useNavigate } from 'react-router-dom'
import { isOverdue, formatDateShort } from '../../utils/helpers'
import { supabase } from '../../lib/supabase'
import type { Issue } from '../../types'

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-[var(--surface-2)] text-[var(--ink-700)]',
}

interface StatCardProps {
  icon: React.ElementType
  value: number
  label: string
  iconColor: string
  iconBg: string
  pulse?: boolean
  onClick?: () => void
}

function StatCard({ icon: Icon, value, label, iconColor, iconBg, pulse, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] hover:border-[var(--primary-200)]' : ''}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--line-2)] to-transparent pointer-events-none" />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[12px] font-medium text-[var(--ink-500)]">{label}</span>
        <div className={`w-9 h-9 ${iconBg} rounded-[var(--r-sm)] flex items-center justify-center relative transition-transform duration-200 group-hover:scale-105`}>
          <Icon size={17} strokeWidth={2} className={iconColor} />
          {pulse && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--danger)] animate-soft-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--danger)]/50 animate-ping" />
            </>
          )}
        </div>
      </div>
      <p className="font-display text-[32px] leading-[1.1] tabular-nums font-semibold text-[var(--ink-900)] tracking-[-0.02em]">{value}</p>
      {onClick && (
        <span className="absolute top-5 right-[56px] opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-[var(--primary)] text-xs font-mono pointer-events-none">↗</span>
      )}
    </div>
  )
}

export function TeamLeadDashboard() {
  const { currentUser } = useApp()
  const dept = currentUser?.department || ''
  const { projects, loading: projLoading } = useProjects()
  const { members } = useTeam()

  // collect IDs of all members in this department so useTasks can
  // OR-include cross-department tasks that were assigned to team members
  const deptMemberIds = useMemo(
    () => members.filter(m => m.department === dept).map(m => m.id),
    [members, dept]
  )

  const { tasks, loading: taskLoading, updateTaskStatus } = useTasks({
    department: dept,
    assigneeIds: deptMemberIds,
  })

  const projectTaskCounts = useMemo(() => {
    const map = new Map<string, { todo: number; active: number; done: number }>()
    for (const t of tasks) {
      if (!t.project_id) continue
      const c = map.get(t.project_id) || { todo: 0, active: 0, done: 0 }
      if (t.status === 'backlog' || t.status === 'onHold') c.todo++
      else if (t.status === 'inProgress') c.active++
      else if (t.status === 'done') c.done++
      map.set(t.project_id, c)
    }
    return map
  }, [tasks])
  const { issues } = useIssues()
  const { openAssignTask, openNewProject } = useDashboardModals()
  const navigate = useNavigate()
  const [openIssue, setOpenIssue] = useState<Issue | null>(null)
  const [taskFilter, setTaskFilter] = useState<'all' | 'my_dept' | 'cross_dept'>('all')

  // Stat card modal
  const [statModal, setStatModal] = useState<{
    open: boolean
    type: 'projects' | 'tasks' | 'overdue' | 'completed'
    title: string
  } | null>(null)

  // Trigger overdue check at most once per 6 hours
  useEffect(() => {
    const THROTTLE_KEY = 'gtrack_overdue_last_check'
    const SIX_HOURS = 6 * 60 * 60 * 1000
    const lastRun = localStorage.getItem(THROTTLE_KEY)
    const now = Date.now()
    if (!lastRun || now - parseInt(lastRun) > SIX_HOURS) {
      supabase.functions.invoke('check-overdue')
        .then(() => localStorage.setItem(THROTTLE_KEY, now.toString()))
        .catch(() => {})
    }
  }, [])

  const deptProjects      = projects.filter(p => p.department === dept)
  const crossDeptProjects = projects.filter(p => p.department !== dept)
  const deptMembers       = members.filter(m => m.department === dept)
  const doneTasks         = tasks.filter(t => t.status === 'done').length
  const overdueTasks      = tasks.filter(t => (t.is_overdue || isOverdue(t.due_date)) && t.status !== 'done').length
  const crossDeptTasks    = tasks.filter(t => t.department !== dept)

  // Stat card modal items — placed after deptProjects/crossDeptProjects are declared
  const modalItems = useMemo(() => {
    if (!statModal) return []
    const allProjects = [...deptProjects, ...crossDeptProjects]
    switch (statModal.type) {
      case 'projects': return allProjects as (Task | Project)[]
      case 'tasks': return tasks as (Task | Project)[]
      case 'overdue': return tasks.filter(t =>
        (t.is_overdue || isOverdue(t.due_date)) && t.status !== 'done'
      ) as (Task | Project)[]
      case 'completed': return tasks.filter(t => t.status === 'done') as (Task | Project)[]
      default: return []
    }
  }, [statModal, tasks, deptProjects, crossDeptProjects])

  const filteredRecentTasks = tasks
    .filter(t => {
      if (taskFilter === 'my_dept') return t.department === dept
      if (taskFilter === 'cross_dept') return t.department !== dept
      return true
    })
    .slice(0, 6)

  const deptIssues = issues.filter(i => i.department === dept)
  const recentIssues = deptIssues.filter(i => i.status === 'open' || i.status === 'in_review').slice(0, 3)

  return (
    <div className="px-4 py-4 md:px-8 md:py-5 xl:py-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-[var(--primary)] bg-[var(--primary-50)] border border-[var(--primary-200)] rounded-[var(--r-xs)] px-2 py-0.5">Team Lead</span>
            <span className="text-[12px] text-[var(--ink-400)]">·</span>
            <span className="text-[12px] text-[var(--ink-500)]">{dept}</span>
          </div>
          <h1 className="font-display text-[24px] md:text-[32px] leading-[1.15] font-semibold text-[var(--ink-900)] tracking-[-0.02em]">
            {dept} dashboard
          </h1>
          <p className="text-[14px] text-[var(--ink-500)] mt-1">
            Manage your team, projects, and tasks.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => openAssignTask()} className="btn-secondary">
            <ListTodo size={14} strokeWidth={2} /> Assign Task
          </button>
          <button onClick={() => openNewProject()} className="btn-primary">
            <Plus size={15} strokeWidth={2.2} /> New Project
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      <OverdueAlertBanner />

      {/* Cross-dept alert banner */}
      {crossDeptTasks.length > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-[var(--r-lg)] px-4 py-3 text-sm text-purple-700">
          <span className="font-bold text-base leading-none">↔</span>
          <span>
            <span className="font-semibold">{crossDeptTasks.length}</span> cross-department task{crossDeptTasks.length !== 1 ? 's' : ''} assigned to your team
          </span>
          <button
            onClick={() => setTaskFilter('cross_dept')}
            className="ml-auto text-xs font-medium underline hover:no-underline"
          >
            View
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
        <StatCard icon={Folder}        value={deptProjects.length + crossDeptProjects.length} label="Projects"    iconColor="text-indigo-600" iconBg="bg-indigo-50" onClick={() => setStatModal({ open: true, type: 'projects', title: 'All Projects' })} />
        <StatCard icon={CheckSquare}   value={tasks.length}        label="Total Tasks" iconColor="text-blue-600"   iconBg="bg-blue-50"   onClick={() => setStatModal({ open: true, type: 'tasks', title: 'All Tasks' })} />
        <StatCard
          icon={AlertTriangle}
          value={overdueTasks}
          label="Overdue"
          iconColor={overdueTasks > 0 ? 'text-red-600' : 'text-[var(--ink-400)]'}
          iconBg={overdueTasks > 0 ? 'bg-red-50' : 'bg-[var(--surface-2)]'}
          pulse={overdueTasks > 0}
          onClick={() => setStatModal({ open: true, type: 'overdue', title: 'Overdue Items' })}
        />
        <StatCard icon={CheckCheck}    value={doneTasks}           label="Completed"   iconColor="text-[var(--primary)]"  iconBg="bg-[var(--primary-50)]" onClick={() => setStatModal({ open: true, type: 'completed', title: 'Completed Tasks' })} />
      </div>

      {/* Main 2-col layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Projects */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-[var(--line-1)]">
              <h2 className="text-base font-bold text-[var(--ink-900)]">
                Projects
                {crossDeptProjects.length > 0 && (
                  <span className="ml-2 text-[11px] font-medium text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
                    +{crossDeptProjects.length} cross-dept
                  </span>
                )}
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {projLoading ? (
                <SkeletonCard count={3} />
              ) : (deptProjects.length + crossDeptProjects.length) === 0 ? (
                <div className="text-center py-10 text-[var(--ink-400)]">
                  <Folder size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No projects yet</p>
                </div>
              ) : [...deptProjects, ...crossDeptProjects].map(project => {
                const tc = projectTaskCounts.get(project.id) || project.task_counts || { todo: 0, active: 0, done: 0 }
                const overdue = project.is_overdue || (project.due_date && isOverdue(project.due_date))
                const isCrossDept = project.department !== dept
                return (
                  <div key={project.id}
                    onClick={() => navigate(`/app/projects/${project.id}`)}
                    className={`border rounded-[var(--r-lg)] p-4 hover:border-[var(--primary)]/30 hover:shadow-sm transition-all cursor-pointer group ${isCrossDept ? 'border-purple-100 bg-purple-50/30' : 'border-[var(--line-1)]'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-[var(--ink-900)] group-hover:text-[var(--primary)] transition-colors">
                            {project.name}
                          </h3>
                          {isCrossDept && (
                            <span className="text-[10px] font-medium text-purple-700 bg-purple-100 rounded-full px-1.5 py-0.5">
                              ↔ {project.department}
                            </span>
                          )}
                        </div>
                        {project.client && <p className="text-xs text-[var(--ink-400)] mt-0.5">{project.client}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {overdue && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            <AlertTriangle size={10} /> Overdue
                          </span>
                        )}
                        <PriorityBadge priority={project.priority} />
                        <StatusBadge status={project.status} />
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--ink-400)]">Progress</span>
                        <span className="font-bold text-[var(--ink-700)]" style={{ fontFamily: 'IBM Plex Mono' }}>{project.progress}%</span>
                      </div>
                      <ProgressBar value={project.progress} color={overdue ? '#ef4444' : undefined} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-medium">
                        <span className="text-orange-500">{tc.todo} todo</span>
                        <span className="text-blue-500">{tc.active} active</span>
                        <span className="text-green-500">{tc.done} done</span>
                      </div>
                      {project.due_date && (
                        <span className={`text-[11px] ${overdue ? 'text-red-500 font-semibold' : 'text-[var(--ink-400)]'}`}>
                          {formatDateShort(project.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:w-72 xl:w-80 2xl:w-96 shrink-0 space-y-4">
          {/* Todo Widget */}
          <TodoWidget />

          {/* Team Members */}
          <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--line-1)]">
              <h3 className="text-sm font-bold text-[var(--ink-900)]">Team Members</h3>
            </div>
            <div className="divide-y divide-[var(--line-1)]">
              {deptMembers.map(member => {
                const mActive = tasks.filter(t => t.assignee_id === member.id && t.status === 'inProgress').length
                const mDone   = tasks.filter(t => t.assignee_id === member.id && t.status === 'done').length
                return (
                  <div key={member.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                    <Avatar name={member.name} size="md" status={member.user_status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink-900)] truncate">{member.name}</p>
                      <p className="text-xs text-[var(--ink-400)]">{mActive} active · {mDone} done</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      member.user_status === 'active'  ? 'bg-green-50 text-green-600'
                      : member.user_status === 'away'  ? 'bg-yellow-50 text-yellow-600'
                      :                                  'bg-[var(--surface-2)] text-[var(--ink-500)]'
                    }`}>
                      {member.user_status}
                    </span>
                  </div>
                )
              })}
              {deptMembers.length === 0 && <p className="px-4 py-4 text-sm text-[var(--ink-400)] text-center">No members</p>}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--line-1)]">
              <h3 className="text-sm font-bold text-[var(--ink-900)]">Recent Tasks</h3>
              {crossDeptTasks.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {(['all', 'my_dept', 'cross_dept'] as const).map(f => (
                    <button key={f} onClick={() => setTaskFilter(f)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                        taskFilter === f
                          ? f === 'cross_dept' ? 'bg-purple-600 text-white' : 'bg-[var(--primary)] text-white'
                          : 'bg-[var(--surface-2)] text-[var(--ink-500)] hover:bg-gray-200'
                      }`}>
                      {f === 'all' ? 'All' : f === 'my_dept' ? 'My Dept' : `↔ Cross (${crossDeptTasks.length})`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="divide-y divide-[var(--line-1)]">
              {taskLoading ? (
                <div className="p-3"><SkeletonCard count={3} /></div>
              ) : filteredRecentTasks.map(task => {
                const taskOverdue = task.is_overdue || (isOverdue(task.due_date) && task.status !== 'done')
                const isCrossTask = task.department !== dept
                return (
                  <div key={task.id} className={`flex items-center gap-2 px-4 py-2.5 ${taskOverdue ? 'bg-red-50/40' : isCrossTask ? 'bg-purple-50/30' : ''}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      taskOverdue         ? 'bg-red-500' :
                      task.priority === 'critical' ? 'bg-red-500' :
                      task.priority === 'high'     ? 'bg-orange-500' :
                      task.priority === 'medium'   ? 'bg-yellow-400' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-xs font-semibold text-[var(--ink-900)] truncate">{task.title}</p>
                        {isCrossTask && (
                          <span className="text-[9px] font-medium text-purple-700 bg-purple-100 rounded-full px-1.5 py-0.5 shrink-0">
                            ↔ {task.department}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${taskOverdue ? 'text-red-500 font-medium' : 'text-[var(--ink-400)]'}`}>
                        {task.assignee_name || '—'}
                        {task.due_date && ` · ${formatDateShort(task.due_date)}`}
                      </p>
                    </div>
                    <select
                      value={task.status}
                      onChange={e => updateTaskStatus(task.id, e.target.value as Task['status'])}
                      onClick={e => e.stopPropagation()}
                      className="text-xs border border-[var(--line-1)] rounded-[var(--r-sm)] px-2 py-1 focus:outline-none focus:border-[var(--primary)] bg-[var(--surface-1)] text-[var(--ink-700)] cursor-pointer"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="inProgress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                )
              })}
              {!taskLoading && filteredRecentTasks.length === 0 && (
                <p className="px-4 py-6 text-sm text-[var(--ink-400)] text-center">
                  {taskFilter === 'cross_dept' ? 'No cross-dept tasks' : taskFilter === 'my_dept' ? 'No department tasks' : 'No tasks yet'}
                </p>
              )}
            </div>
          </div>

          {/* Recent Issues */}
          {recentIssues.length > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line-1)]">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-[var(--ink-900)]">Recent Issues</h3>
                </div>
                <button onClick={() => navigate('/app/issues')}
                  className="text-xs text-[var(--primary)] hover:underline font-medium">All →</button>
              </div>
              <div className="divide-y divide-[var(--line-1)]">
                {recentIssues.map(issue => (
                  <button
                    key={issue.id}
                    onClick={() => setOpenIssue(issue)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority] || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--ink-900)] truncate">{issue.title}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-[var(--ink-400)]">{issue.raised_by_name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLE[issue.status] || 'bg-[var(--surface-2)] text-[var(--ink-700)]'}`}>
                            {issue.status === 'in_review' ? 'In Review' : issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {openIssue && (
        <IssueDetailDrawer
          issue={openIssue}
          onClose={() => setOpenIssue(null)}
          onUpdate={() => {}}
        />
      )}

      {statModal && (
        <StatCardModal
          isOpen={statModal.open}
          onClose={() => setStatModal(null)}
          type={statModal.type}
          title={statModal.title}
          items={modalItems}
          loading={taskLoading || projLoading}
        />
      )}
    </div>
  )
}
