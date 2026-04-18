import { useState, useEffect, useMemo } from 'react'
import {
  Folder, CheckSquare, CheckCheck, Plus, AlertCircle,
  Calendar, Users, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { useTasks } from '../../hooks/useTasks'
import { useTeam } from '../../hooks/useTeam'
import { useIssues } from '../../hooks/useIssues'
import { Avatar } from '../../shared/Avatar'
import { ProgressBar } from '../../shared/ProgressBar'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { DeptBadge } from '../../shared/Badge'
import { SkeletonCard } from '../../shared/SkeletonCard'
import { IssueDetailDrawer } from '../../modals/IssueDetailDrawer'
import { useDashboardModals } from '../../layouts/DashboardLayout'
import { TodoWidget } from '../todos/TodoWidget'
import { OverdueAlertBanner } from '../../components/OverdueAlertBanner'
import { StatCardModal } from '../../components/dashboard/StatCardModal'
import { useNavigate } from 'react-router-dom'
import { formatDateShort, isOverdue } from '../../utils/helpers'
import { supabase } from '../../lib/supabase'
import type { Issue, Task, Project, TodoItem } from '../../types'

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
  sub?: string
  iconColor: string
  iconBg: string
  pulse?: boolean
  onClick?: () => void
}

function StatCard({ icon: Icon, value, label, sub, iconColor, iconBg, pulse, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] hover:border-[var(--primary-200)]' : ''}`}
    >
      {/* Subtle top gradient sheen */}
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

      {sub && (
        <p className="mt-1 text-[12px] text-[var(--ink-500)]">{sub}</p>
      )}

      {onClick && (
        <span className="absolute top-5 right-[56px] opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-[var(--primary)] text-xs font-mono pointer-events-none">
          ↗
        </span>
      )}
    </div>
  )
}

export function DirectorDashboard() {
  const { projects, loading: projLoading } = useProjects()
  const { tasks, loading: taskLoading } = useTasks()
  const { members } = useTeam()
  const { issues } = useIssues()
  const { openAssignTask, openNewProject } = useDashboardModals()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [openIssue, setOpenIssue] = useState<Issue | null>(null)
  const [teamLeadTodos, setTeamLeadTodos] = useState<(TodoItem & { owner?: { id: string; name: string; department: string | null } | null })[]>([])

  // Stat card modal state
  const [statModal, setStatModal] = useState<{
    open: boolean
    type: 'projects' | 'tasks' | 'overdue' | 'completed'
    title: string
  } | null>(null)

  const modalItems = useMemo(() => {
    if (!statModal) return []
    switch (statModal.type) {
      case 'projects': return projects as (Task | Project)[]
      case 'tasks': return tasks as (Task | Project)[]
      case 'overdue': return tasks.filter(t =>
        (t.is_overdue || isOverdue(t.due_date)) && t.status !== 'done'
      ) as (Task | Project)[]
      case 'completed': return tasks.filter(t => t.status === 'done') as (Task | Project)[]
      default: return []
    }
  }, [statModal, tasks, projects])

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

  // Feature 4: Fetch team lead todos (visible due to updated RLS policy)
  useEffect(() => {
    const loadTeamLeadTodos = async () => {
      try {
        let result = await supabase
          .from('personal_todos')
          .select('*, owner:profiles!personal_todos_user_id_fkey(id, name, department, role)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10)

        // FK name may differ — fall back to simple select if join fails
        if (result.error) {
          result = await supabase
            .from('personal_todos')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10)
        }

        if (result.data) {
          setTeamLeadTodos(result.data as (TodoItem & { owner?: { id: string; name: string; department: string | null } | null })[])
        }
      } catch {
        // ignore
      }
    }
    loadTeamLeadTodos()
  }, [])

  const depts = [...new Set(projects.map(p => p.department))].sort()
  const filtered = projects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (deptFilter !== 'all' && p.department !== deptFilter) return false
    return true
  })

  const activeTasks  = tasks.filter(t => t.status === 'inProgress').length
  const doneTasks    = tasks.filter(t => t.status === 'done').length
  const overdueTasks = tasks.filter(t => (t.is_overdue || isOverdue(t.due_date)) && t.status !== 'done').length

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

  // Department health
  const deptHealth = depts.map(dept => {
    const dp = projects.filter(p => p.department === dept)
    const avgProg = dp.length ? Math.round(dp.reduce((a, p) => a + p.progress, 0) / dp.length) : 0
    const mems = members.filter(m => m.department === dept).length
    return { dept, projects: dp.length, progress: avgProg, members: mems }
  })

  const recentIssues = issues.filter(i => i.status === 'open' || i.status === 'in_review').slice(0, 3)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-[var(--primary)] bg-[var(--primary-50)] border border-[var(--primary-200)] rounded-[var(--r-xs)] px-2 py-0.5">Director</span>
            <span className="text-[12px] text-[var(--ink-400)]">·</span>
            <span className="text-[12px] text-[var(--ink-500)]">Company overview</span>
          </div>
          <h1 className="font-display text-[24px] md:text-[32px] leading-[1.15] font-semibold text-[var(--ink-900)] tracking-[-0.02em]">
            Company overview
          </h1>
          <p className="text-[14px] text-[var(--ink-500)] mt-1">
            Monitor all projects and teams across Garage Collective.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => openAssignTask()} className="btn-secondary">
            <CheckSquare size={14} strokeWidth={2} /> Assign Task
          </button>
          <button onClick={() => openNewProject()} className="btn-primary">
            <Plus size={15} strokeWidth={2.2} /> New Project
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      <OverdueAlertBanner />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 stagger">
        <StatCard icon={Folder}        value={projects.length} label="Total Projects"  sub={`${projects.filter(p=>p.status==='inProgress').length} active`}   iconColor="text-indigo-600" iconBg="bg-indigo-50"  onClick={() => setStatModal({ open: true, type: 'projects', title: 'All Projects' })} />
        <StatCard icon={CheckSquare}   value={tasks.length}    label="Total Tasks"     sub={`${activeTasks} in progress`}                                       iconColor="text-blue-600"   iconBg="bg-blue-50"   onClick={() => setStatModal({ open: true, type: 'tasks', title: 'All Tasks' })} />
        <StatCard
          icon={AlertTriangle}
          value={overdueTasks}
          label="Overdue"
          sub="Need immediate action"
          iconColor={overdueTasks > 0 ? 'text-red-600' : 'text-[var(--ink-400)]'}
          iconBg={overdueTasks > 0 ? 'bg-red-50' : 'bg-[var(--surface-2)]'}
          pulse={overdueTasks > 0}
          onClick={() => setStatModal({ open: true, type: 'overdue', title: 'Overdue Items' })}
        />
        <StatCard icon={CheckCheck}    value={doneTasks}       label="Done"            sub={`${members.length} team members`}                                   iconColor="text-[var(--primary)]"  iconBg="bg-[var(--primary-50)]" onClick={() => setStatModal({ open: true, type: 'completed', title: 'Completed Tasks' })} />
      </div>

      {/* Department Health */}
      {deptHealth.length > 0 && (
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} strokeWidth={2} className="text-[var(--primary)]" />
              <h2 className="text-[14px] font-semibold text-[var(--ink-900)]">Department health</h2>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--ink-400)]">
              {deptHealth.length} active
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {deptHealth.map(({ dept, projects: pCount, progress, members: mCount }) => (
              <div key={dept} className="group p-4 rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-1)] hover:border-[var(--primary-200)] hover:shadow-[var(--shadow-sm)] transition-all duration-200">
                <p className="text-[11px] font-medium text-[var(--ink-500)] uppercase tracking-[0.04em] truncate mb-2">{dept}</p>
                <p className="font-display text-[24px] leading-[1.1] font-semibold tabular-nums text-[var(--ink-900)]">
                  {progress}<span className="text-[var(--ink-400)] text-[16px] font-normal">%</span>
                </p>
                <ProgressBar value={progress} size="sm" className="mt-2 mb-2" />
                <div className="flex justify-between text-[11px] tabular-nums text-[var(--ink-500)]">
                  <span>{pCount} proj</span>
                  <span>{mCount} people</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-col layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Projects */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--line-1)] flex-wrap">
              <h2 className="text-base font-bold text-[var(--ink-900)]">All Projects</h2>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs border border-[var(--line-1)] rounded-[var(--r-sm)] px-2.5 py-1.5 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none focus:border-[var(--primary)]">
                  <option value="all">All Status</option>
                  <option value="backlog">Backlog</option>
                  <option value="inProgress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="onHold">On Hold</option>
                </select>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                  className="text-xs border border-[var(--line-1)] rounded-[var(--r-sm)] px-2.5 py-1.5 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none focus:border-[var(--primary)]">
                  <option value="all">All Departments</option>
                  {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5">
              {projLoading ? (
                <div className="space-y-3"><SkeletonCard count={4} /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-[var(--ink-400)]">
                  <Folder size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No projects match filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {filtered.map(project => {
                    const tc = projectTaskCounts.get(project.id) || project.task_counts || { todo: 0, active: 0, done: 0 }
                    const overdue = project.is_overdue || (project.due_date && isOverdue(project.due_date))
                    return (
                      <div key={project.id}
                        onClick={() => navigate(`/app/projects/${project.id}`)}
                        className="border border-[var(--line-1)] rounded-[var(--r-lg)] p-4 hover:border-[var(--primary)]/40 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 mr-2">
                            <h3 className="text-sm font-bold text-[var(--ink-900)] group-hover:text-[var(--primary)] transition-colors truncate">
                              {project.name}
                            </h3>
                            {project.client && <p className="text-xs text-[var(--ink-400)] mt-0.5">{project.client}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {overdue && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                <AlertTriangle size={10} /> Overdue
                              </span>
                            )}
                            <StatusBadge status={project.status} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <DeptBadge department={project.department} />
                          <PriorityBadge priority={project.priority} />
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1.5">
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
                            <span className={`flex items-center gap-1 text-[11px] ${overdue ? 'text-red-500 font-semibold' : 'text-[var(--ink-400)]'}`}>
                              <Calendar size={11} />{formatDateShort(project.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:w-72 xl:w-80 2xl:w-96 shrink-0 space-y-4">
          {/* Todo Widget */}
          <TodoWidget />

          {/* Feature 4: Team Lead To-Dos */}
          {teamLeadTodos.length > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line-1)]">
                <h3 className="text-sm font-semibold text-[var(--ink-900)]">Team Lead To-Dos</h3>
                <span className="text-xs text-[var(--ink-400)]">{teamLeadTodos.length} pending</span>
              </div>
              <div className="divide-y divide-[var(--line-1)]">
                {teamLeadTodos.slice(0, 8).map(todo => (
                  <div key={todo.id} className="px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-2 h-2 rounded-full border border-[var(--line-2)] shrink-0" />
                      <p className="text-xs font-medium text-[var(--ink-900)] truncate">{todo.title}</p>
                    </div>
                    {(todo as any).owner && (
                      <p className="text-[10px] text-[var(--ink-400)] ml-4">{(todo as any).owner.name} · {(todo as any).owner.department}</p>
                    )}
                    {todo.notes && (
                      <p className="text-[10px] text-[var(--ink-500)] ml-4 mt-0.5 line-clamp-1 italic">{todo.notes}</p>
                    )}
                    {todo.project_name && (
                      <p className="text-[10px] text-[var(--primary)] ml-4 mt-0.5">📁 {todo.project_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Members */}
          <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-1)]">
              <Users size={14} className="text-[var(--ink-400)]" />
              <h3 className="text-sm font-semibold text-[var(--ink-900)]">Team</h3>
              <span className="ml-auto text-xs text-[var(--ink-400)]">{members.length} members</span>
            </div>
            <div className="divide-y divide-[var(--line-1)] max-h-64 overflow-y-auto">
              {members.slice(0, 8).map(m => {
                const mActive = tasks.filter(t => t.assignee_id === m.id && t.status === 'inProgress').length
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                    <Avatar name={m.name} size="sm" status={m.user_status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--ink-900)] truncate">{m.name}</p>
                      <p className="text-xs text-[var(--ink-400)]">{m.department} · {mActive} active</p>
                    </div>
                  </div>
                )
              })}
              {members.length === 0 && <p className="px-4 py-4 text-sm text-[var(--ink-400)] text-center">No members</p>}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--line-1)]">
              <h3 className="text-sm font-semibold text-[var(--ink-900)]">Recent Tasks</h3>
            </div>
            <div className="divide-y divide-[var(--line-1)]">
              {taskLoading ? (
                <div className="p-4"><SkeletonCard count={3} /></div>
              ) : tasks.slice(0, 6).map(task => {
                const taskOverdue = task.is_overdue || (isOverdue(task.due_date) && task.status !== 'done')
                return (
                  <div key={task.id} className={`px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors ${taskOverdue ? 'bg-red-50/40' : ''}`}>
                    <div className="flex items-start gap-1.5">
                      {taskOverdue && <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />}
                      <p className="text-sm font-medium text-[var(--ink-900)] truncate">{task.title}</p>
                    </div>
                    {/* Fix #6: show assignee + "by [creator]" + due date */}
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${taskOverdue ? 'text-red-500 font-medium' : 'text-[var(--ink-400)]'}`}>
                        {task.assignee_name || 'Unassigned'}
                        {task.created_by_name && task.created_by_name !== task.assignee_name
                          ? ` · by ${task.created_by_name}` : ''}
                        {task.due_date && ` · ${formatDateShort(task.due_date)}`}
                      </span>
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                )
              })}
              {!taskLoading && tasks.length === 0 && (
                <p className="px-4 py-6 text-sm text-[var(--ink-400)] text-center">No tasks yet</p>
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

      {/* Stat card modal */}
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
