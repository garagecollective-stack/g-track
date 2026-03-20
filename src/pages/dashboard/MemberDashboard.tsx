import { useState } from 'react'
import { CheckSquare, Zap, CheckCheck, AlertTriangle, Calendar, FolderKanban, Info, AlertCircle, Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useIssues } from '../../hooks/useIssues'
import { ExpandableText } from '../../components/ExpandableText'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { ProgressBar } from '../../shared/ProgressBar'
import { SkeletonCard } from '../../shared/SkeletonCard'
import { TodoWidget } from '../todos/TodoWidget'
import { isOverdue, formatDateShort, timeAgo } from '../../utils/helpers'
import { useToast } from '../../hooks/useToast'
import { friendlyError } from '../../utils/helpers'
import { useNavigate } from 'react-router-dom'
import { RaiseIssueModal } from '../../modals/RaiseIssueModal'
import { IssueDetailDrawer } from '../../modals/IssueDetailDrawer'
import type { TaskStatus, Issue } from '../../types'

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_review: 'In Review',
  resolved: 'Resolved',
  closed: 'Closed',
}

interface StatCardProps {
  icon: React.ElementType
  value: number
  label: string
  iconColor: string
  iconBg: string
}

function StatCard({ icon: Icon, value, label, iconColor, iconBg }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 md:w-10 md:h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={18} className={iconColor} />
      </div>
      <p className="text-2xl md:text-3xl font-black text-gray-900" style={{ fontFamily: 'DM Mono, monospace' }}>{value}</p>
      <p className="text-xs md:text-sm font-semibold text-gray-600 mt-0.5">{label}</p>
    </div>
  )
}

export function MemberDashboard() {
  const { currentUser } = useApp()
  const { tasks, loading: taskLoading, updateTaskStatus } = useTasks({ assigneeId: currentUser?.id })
  const { projects, loading: projLoading } = useProjects()
  const { issues, loading: issuesLoading } = useIssues()
  const toast = useToast()
  const navigate = useNavigate()
  const [showRaiseIssue, setShowRaiseIssue] = useState(false)
  const [openIssue, setOpenIssue] = useState<Issue | null>(null)

  const myTasks    = tasks.filter(t => t.assignee_id === currentUser?.id)
  const inProgress = myTasks.filter(t => t.status === 'inProgress').length
  const done       = myTasks.filter(t => t.status === 'done').length
  const overdueCnt = myTasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length

  const urgentTasks = myTasks.filter(
    t => t.status !== 'done' && t.due_date &&
    new Date(t.due_date) <= new Date(Date.now() + 2 * 86400000)
  )

  const myIssues = issues.filter(i => i.raised_by === currentUser?.id)

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try { await updateTaskStatus(id, status) }
    catch (err) { toast.error(friendlyError(err)) }
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900" style={{ letterSpacing: '-0.5px' }}>My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {currentUser?.name.split(' ')[0]}</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5 mb-5">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700">
          <span className="font-medium">Read-only mode.</span> You can view tasks and update their status only.{' '}
          To request changes, raise an issue with your lead.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard icon={CheckSquare}   value={myTasks.length} label="My Tasks"    iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard icon={Zap}           value={inProgress}     label="In Progress" iconColor="text-blue-600"   iconBg="bg-blue-50"   />
        <StatCard icon={CheckCheck}    value={done}           label="Completed"   iconColor="text-[#0A5540]"  iconBg="bg-[#edf8f4]" />
        <StatCard icon={AlertTriangle} value={overdueCnt}     label="Overdue"     iconColor={overdueCnt > 0 ? 'text-red-500' : 'text-gray-400'} iconBg={overdueCnt > 0 ? 'bg-red-50' : 'bg-gray-50'} />
      </div>

      {/* Urgent banner */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-700">
              {urgentTasks.length} task{urgentTasks.length > 1 ? 's' : ''} due within 48 hours
            </p>
            <p className="text-xs text-red-500 mt-0.5 line-clamp-1">
              {urgentTasks.map(t => t.title).join(' · ')}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Main: My Tasks */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Tasks section */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">My Tasks</h2>
            {taskLoading ? (
              <div className="space-y-2"><SkeletonCard count={4} /></div>
            ) : myTasks.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
                <CheckSquare size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No tasks assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map(task => {
                  const taskOverdue = isOverdue(task.due_date) && task.status !== 'done'
                  return (
                    <div key={task.id}
                      className={`bg-white border rounded-xl p-4 transition-all ${
                        taskOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                      }`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          {/* Read-only task title — no click to open modal */}
                          <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                          {task.project_name && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <FolderKanban size={11} /> {task.project_name}
                            </span>
                          )}
                          {task.description && (
                            <ExpandableText text={task.description} maxLength={100} className="mt-1" />
                          )}
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={task.priority} />
                          {task.due_date && (
                            <span className={`flex items-center gap-1 text-xs ${taskOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                              <Calendar size={11} />
                              {taskOverdue ? 'Overdue · ' : ''}{formatDateShort(task.due_date)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status-only actions for member */}
                          {task.status === 'backlog' && (
                            <button onClick={() => handleStatusChange(task.id, 'inProgress')}
                              className="text-xs px-2.5 py-1 bg-[#0A5540] text-white font-medium rounded-lg hover:bg-[#0d6b51] transition-colors">
                              Start
                            </button>
                          )}
                          {task.status === 'inProgress' && (
                            <button onClick={() => handleStatusChange(task.id, 'done')}
                              className="text-xs px-2.5 py-1 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors">
                              Done
                            </button>
                          )}
                          {/* Issue button */}
                          <button
                            onClick={() => setShowRaiseIssue(true)}
                            className="text-xs px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            ⚠ Issue
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* My Issues section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">My Issues</h2>
              <button
                onClick={() => setShowRaiseIssue(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Plus size={12} /> Raise New Issue
              </button>
            </div>
            {issuesLoading ? (
              <SkeletonCard count={2} />
            ) : myIssues.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
                <AlertCircle size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No issues raised yet</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden">
                {myIssues.map(issue => (
                  <button
                    key={issue.id}
                    onClick={() => setOpenIssue(issue)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{issue.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{issue.entity_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[issue.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[issue.status] || issue.status}
                      </span>
                      <span className="text-[11px] text-gray-400">{timeAgo(issue.updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-72 xl:w-80 shrink-0 space-y-4">
          {/* Personal To-Do Widget */}
          <TodoWidget />

          {/* My Projects */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">My Projects</h3>
            </div>
            <div className="p-3 space-y-2">
              {projLoading ? (
                <SkeletonCard count={2} />
              ) : projects.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Not on any projects yet</p>
              ) : projects.map(project => (
                <div key={project.id}
                  onClick={() => navigate(`/app/projects/${project.id}`)}
                  className="p-3 rounded-xl border border-gray-100 hover:border-[#0A5540]/30 hover:bg-gray-50 cursor-pointer transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-bold text-gray-900 group-hover:text-[#0A5540] transition-colors truncate">
                      {project.name}
                    </p>
                    <StatusBadge status={project.status} />
                  </div>
                  <ProgressBar value={project.progress} showLabel size="sm" />
                  {project.client && <p className="text-[10px] text-gray-400 mt-1">{project.client}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Completed Tasks */}
          {done > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Completed ({done})</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {myTasks.filter(t => t.status === 'done').map(task => (
                  <div key={task.id} className="flex items-start gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <CheckCheck size={14} className="text-[#0A5540] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 line-through truncate">{task.title}</p>
                      {task.project_name && <p className="text-[10px] text-gray-400">{task.project_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button — Raise Issue */}
      <button
        onClick={() => setShowRaiseIssue(true)}
        className="fixed bottom-[148px] right-4 md:bottom-20 md:right-6 bg-amber-500 hover:bg-amber-600 text-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 text-sm font-medium transition-colors z-40"
      >
        <AlertCircle size={18} />
        <span className="hidden sm:inline">Raise Issue</span>
      </button>

      {/* Raise Issue Modal */}
      <RaiseIssueModal
        open={showRaiseIssue}
        onClose={() => setShowRaiseIssue(false)}
        presetEntity={myTasks.length > 0 ? { type: 'task', id: myTasks[0].id, name: myTasks[0].title } : undefined}
      />

      {/* Issue Detail Drawer (read-only for member) */}
      {openIssue && (
        <IssueDetailDrawer
          issue={openIssue}
          onClose={() => setOpenIssue(null)}
          onUpdate={() => {}}
          readOnly={true}
        />
      )}
    </div>
  )
}
