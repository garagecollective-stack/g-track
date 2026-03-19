import { useState, useEffect } from 'react'
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
import { useNavigate } from 'react-router-dom'
import { formatDateShort, isOverdue } from '../../utils/helpers'
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
  closed: 'bg-gray-100 text-gray-600',
}

interface StatCardProps {
  icon: React.ElementType
  value: number
  label: string
  sub?: string
  iconColor: string
  iconBg: string
  pulse?: boolean
}

function StatCard({ icon: Icon, value, label, sub, iconColor, iconBg, pulse }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3 relative`}>
        <Icon size={20} className={iconColor} />
        {pulse && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      <p className="text-3xl font-black text-gray-900" style={{ fontFamily: 'DM Mono, monospace' }}>{value}</p>
      <p className="text-sm font-semibold text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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

  // Trigger overdue check at most once per hour
  useEffect(() => {
    const THROTTLE_KEY = 'gtrack_overdue_last_check'
    const ONE_HOUR = 60 * 60 * 1000
    const lastRun = localStorage.getItem(THROTTLE_KEY)
    const now = Date.now()
    if (!lastRun || now - parseInt(lastRun) > ONE_HOUR) {
      supabase.functions.invoke('check-overdue').then(() => {
        localStorage.setItem(THROTTLE_KEY, now.toString())
      })
    }
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

  // Department health
  const deptHealth = depts.map(dept => {
    const dp = projects.filter(p => p.department === dept)
    const avgProg = dp.length ? Math.round(dp.reduce((a, p) => a + p.progress, 0) / dp.length) : 0
    const mems = members.filter(m => m.department === dept).length
    return { dept, projects: dp.length, progress: avgProg, members: mems }
  })

  const recentIssues = issues.filter(i => i.status === 'open' || i.status === 'in_review').slice(0, 3)

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900" style={{ letterSpacing: '-0.5px' }}>Company Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all projects and teams across Garage Collective</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => openAssignTask()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0A5540] bg-[#edf8f4] border border-[#0A5540]/20 rounded-lg hover:bg-[#d6f0e8] transition-colors">
            <CheckSquare size={14} /> Assign Task
          </button>
          <button onClick={() => openNewProject()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors shadow-sm">
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      <OverdueAlertBanner />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
        <StatCard icon={Folder}        value={projects.length} label="Total Projects"  sub={`${projects.filter(p=>p.status==='inProgress').length} active`}   iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard icon={CheckSquare}   value={tasks.length}    label="Total Tasks"     sub={`${activeTasks} in progress`}                                       iconColor="text-blue-600"   iconBg="bg-blue-50"   />
        <StatCard
          icon={AlertTriangle}
          value={overdueTasks}
          label="Overdue"
          sub="Need immediate action"
          iconColor={overdueTasks > 0 ? 'text-red-600' : 'text-gray-400'}
          iconBg={overdueTasks > 0 ? 'bg-red-50' : 'bg-gray-50'}
          pulse={overdueTasks > 0}
        />
        <StatCard icon={CheckCheck}    value={doneTasks}       label="Done"            sub={`${members.length} team members`}                                   iconColor="text-[#0A5540]"  iconBg="bg-[#edf8f4]" />
      </div>

      {/* Department Health */}
      {deptHealth.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#0A5540]" />
            <h2 className="text-base font-bold text-gray-900">Department Health</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {deptHealth.map(({ dept, projects: pCount, progress, members: mCount }) => (
              <div key={dept} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors text-center">
                <p className="text-[11px] font-bold text-gray-600 mb-1 truncate">{dept}</p>
                <p className="text-2xl font-black text-gray-900" style={{ fontFamily: 'DM Mono' }}>{progress}%</p>
                <ProgressBar value={progress} size="sm" className="mt-1 mb-2" />
                <div className="flex justify-between text-[10px] text-gray-400">
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
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
              <h2 className="text-base font-bold text-gray-900">All Projects</h2>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#0A5540]">
                  <option value="all">All Status</option>
                  <option value="backlog">Backlog</option>
                  <option value="inProgress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="onHold">On Hold</option>
                </select>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#0A5540]">
                  <option value="all">All Departments</option>
                  {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5">
              {projLoading ? (
                <div className="space-y-3"><SkeletonCard count={4} /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Folder size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No projects match filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {filtered.map(project => {
                    const tc = project.task_counts || { todo: 0, active: 0, done: 0 }
                    const overdue = project.is_overdue || (project.due_date && isOverdue(project.due_date))
                    return (
                      <div key={project.id}
                        onClick={() => navigate(`/app/projects/${project.id}`)}
                        className="border border-gray-100 rounded-xl p-4 hover:border-[#0A5540]/40 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 mr-2">
                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#0A5540] transition-colors truncate">
                              {project.name}
                            </h3>
                            {project.client && <p className="text-xs text-gray-400 mt-0.5">{project.client}</p>}
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
                            <span className="text-gray-400">Progress</span>
                            <span className="font-bold text-gray-700" style={{ fontFamily: 'DM Mono' }}>{project.progress}%</span>
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
                            <span className={`flex items-center gap-1 text-[11px] ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
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
        <div className="lg:w-72 xl:w-80 shrink-0 space-y-4">
          {/* Todo Widget */}
          <TodoWidget />

          {/* Team Members */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Users size={14} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Team</h3>
              <span className="ml-auto text-xs text-gray-400">{members.length} members</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {members.slice(0, 8).map(m => {
                const mActive = tasks.filter(t => t.assignee_id === m.id && t.status === 'inProgress').length
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <Avatar name={m.name} size="sm" status={m.user_status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.department} · {mActive} active</p>
                    </div>
                  </div>
                )
              })}
              {members.length === 0 && <p className="px-4 py-4 text-sm text-gray-400 text-center">No members</p>}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Recent Tasks</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {taskLoading ? (
                <div className="p-4"><SkeletonCard count={3} /></div>
              ) : tasks.slice(0, 6).map(task => {
                const taskOverdue = task.is_overdue || (isOverdue(task.due_date) && task.status !== 'done')
                return (
                  <div key={task.id} className={`px-4 py-2.5 hover:bg-gray-50 transition-colors ${taskOverdue ? 'bg-red-50/40' : ''}`}>
                    <div className="flex items-start gap-1.5">
                      {taskOverdue && <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />}
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    </div>
                    {/* Fix #6: show assignee + "by [creator]" + due date */}
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${taskOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
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
                <p className="px-4 py-6 text-sm text-gray-400 text-center">No tasks yet</p>
              )}
            </div>
          </div>

          {/* Recent Issues */}
          {recentIssues.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Recent Issues</h3>
                </div>
                <button onClick={() => navigate('/app/issues')}
                  className="text-xs text-[#0A5540] hover:underline font-medium">All →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {recentIssues.map(issue => (
                  <button
                    key={issue.id}
                    onClick={() => setOpenIssue(issue)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority] || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{issue.title}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-gray-400">{issue.raised_by_name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLE[issue.status] || 'bg-gray-100 text-gray-600'}`}>
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
    </div>
  )
}
