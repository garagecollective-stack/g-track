import { useState, useMemo, useEffect } from 'react'
import { CheckSquare, Zap, CheckCheck, AlertTriangle, Calendar, FolderKanban, Info, AlertCircle, Plus, X } from 'lucide-react'
import { StatCardModal } from '../../components/dashboard/StatCardModal'
import { supabase } from '../../lib/supabase'
import type { Task, Project } from '../../types'
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
  closed: 'bg-[var(--surface-2)] text-[var(--ink-700)]',
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
  onClick?: () => void
}

function StatCard({ icon: Icon, value, label, iconColor, iconBg, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-4 md:p-5 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] hover:border-[var(--primary-200)]' : ''}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--line-2)] to-transparent pointer-events-none" />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[12px] font-medium text-[var(--ink-500)]">{label}</span>
        <div className={`w-9 h-9 ${iconBg} rounded-[var(--r-sm)] flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
          <Icon size={17} strokeWidth={2} className={iconColor} />
        </div>
      </div>
      <p className="font-display text-[28px] md:text-[32px] leading-[1.1] tabular-nums font-semibold text-[var(--ink-900)] tracking-[-0.02em]">{value}</p>
      {onClick && (
        <span className="absolute top-4 right-[52px] opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-[var(--primary)] text-xs font-mono pointer-events-none">↗</span>
      )}
    </div>
  )
}

interface RevisionFeedback {
  revision_number: number
  feedback: string
  submitted_by_name: string | null
  created_at: string
}

function RevisionViewModal({ task, onClose, onMarkDone }: {
  task: Task
  onClose: () => void
  onMarkDone: () => void
}) {
  const [revisions, setRevisions] = useState<RevisionFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    supabase
      .from('task_revisions')
      .select('revision_number, feedback, submitted_by_name, created_at')
      .eq('task_id', task.id)
      .order('revision_number', { ascending: false })
      .then(({ data }) => { setRevisions(data || []); setLoading(false) })
  }, [task.id])

  const latest = revisions[0]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--surface-1)] rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--line-1)]">
          <div>
            <p className="text-[11px] font-semibold text-orange-500 uppercase tracking-wide mb-0.5">Revision Requested</p>
            <h2 className="text-base font-bold text-[var(--ink-900)] leading-tight">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="h-20 bg-[var(--surface-2)] rounded-[var(--r-lg)] animate-pulse" />
          ) : latest ? (
            <div className="bg-orange-50 border border-orange-200 rounded-[var(--r-lg)] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-700">Revision #{latest.revision_number}</span>
                {latest.submitted_by_name && (
                  <span className="text-[11px] text-[var(--ink-400)]">by {latest.submitted_by_name}</span>
                )}
              </div>
              <p className="text-sm text-[var(--ink-900)] whitespace-pre-wrap leading-relaxed">{latest.feedback}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-400)] text-center py-4">No revision details available.</p>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-[var(--ink-700)] bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] hover:bg-[var(--surface-2)] transition-colors">
              Close
            </button>
            <button
              disabled={marking}
              onClick={async () => {
                setMarking(true)
                await onMarkDone()
                setMarking(false)
              }}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-lg)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-60">
              {marking ? 'Saving…' : '✓ Mark as Done'}
            </button>
          </div>
        </div>
      </div>
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [statModal, setStatModal] = useState<{
    open: boolean
    type: 'projects' | 'tasks' | 'overdue' | 'completed'
    title: string
  } | null>(null)

  const myTasks    = tasks.filter(t => t.assignee_id === currentUser?.id)

  const modalItems = useMemo(() => {
    if (!statModal) return []
    switch (statModal.type) {
      case 'tasks': return myTasks as (Task | Project)[]
      case 'overdue': return myTasks.filter(t => isOverdue(t.due_date) && t.status !== 'done') as (Task | Project)[]
      case 'completed': return myTasks.filter(t => t.status === 'done') as (Task | Project)[]
      default: return []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statModal, myTasks])
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
    <div className="px-4 py-4 md:px-8 md:py-5 xl:py-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-[var(--primary)] bg-[var(--primary-50)] border border-[var(--primary-200)] rounded-[var(--r-xs)] px-2 py-0.5">Member</span>
          <span className="text-[12px] text-[var(--ink-400)]">·</span>
          <span className="text-[12px] text-[var(--ink-500)]">{currentUser?.department || 'Workspace'}</span>
        </div>
        <h1 className="font-display text-[24px] md:text-[32px] leading-[1.15] font-semibold text-[var(--ink-900)] tracking-[-0.02em]">
          Welcome back, {currentUser?.name.split(' ')[0]}
        </h1>
        <p className="text-[14px] text-[var(--ink-500)] mt-1">
          Here's what's on your plate today.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-[var(--r-lg)] px-4 py-3 flex items-start gap-2.5 mb-5">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700">
          <span className="font-medium">Read-only mode.</span> You can view tasks and update their status only.{' '}
          To request changes, raise an issue with your lead.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard icon={CheckSquare}   value={myTasks.length} label="My Tasks"    iconColor="text-indigo-600" iconBg="bg-indigo-50" onClick={() => setStatModal({ open: true, type: 'tasks', title: 'My Tasks' })} />
        <StatCard icon={Zap}           value={inProgress}     label="In Progress" iconColor="text-blue-600"   iconBg="bg-blue-50"   onClick={() => setStatModal({ open: true, type: 'tasks', title: 'In Progress Tasks' })} />
        <StatCard icon={CheckCheck}    value={done}           label="Completed"   iconColor="text-[var(--primary)]"  iconBg="bg-[var(--primary-50)]" onClick={() => setStatModal({ open: true, type: 'completed', title: 'Completed Tasks' })} />
        <StatCard icon={AlertTriangle} value={overdueCnt}     label="Overdue"     iconColor={overdueCnt > 0 ? 'text-red-500' : 'text-[var(--ink-400)]'} iconBg={overdueCnt > 0 ? 'bg-red-50' : 'bg-[var(--surface-2)]'} onClick={() => setStatModal({ open: true, type: 'overdue', title: 'Overdue Tasks' })} />
      </div>

      {/* Urgent banner */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-[var(--r-lg)] flex items-center justify-center shrink-0">
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
            <h2 className="text-base font-bold text-[var(--ink-900)] mb-3">My Tasks</h2>
            {taskLoading ? (
              <div className="space-y-2"><SkeletonCard count={4} /></div>
            ) : myTasks.length === 0 ? (
              <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-10 text-center">
                <CheckSquare size={36} className="mx-auto text-[var(--ink-400)] mb-3" />
                <p className="text-sm text-[var(--ink-400)]">No tasks assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map(task => {
                  const taskOverdue = isOverdue(task.due_date) && task.status !== 'done'
                  return (
                    <div key={task.id}
                      onClick={() => task.has_active_revision ? setSelectedTask(task) : undefined}
                      className={`bg-[var(--surface-1)] border rounded-[var(--r-lg)] p-4 transition-all ${task.has_active_revision ? 'cursor-pointer hover:shadow-sm' : ''} ${
                        task.has_active_revision ? 'border-orange-200 bg-orange-50/30 hover:border-orange-300'
                        : taskOverdue ? 'border-red-200 bg-red-50/30'
                        : 'border-[var(--line-1)] hover:border-[var(--primary)]/30'
                      }`}>
                      {task.has_active_revision && (
                        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-orange-600">
                          <span>⟲</span> Revision Requested — tap to view feedback
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-[var(--ink-400)]' : 'text-[var(--ink-900)]'}`}>
                            {task.title}
                          </p>
                          {task.project_name && (
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-500)] mt-0.5">
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
                            <span className={`flex items-center gap-1 text-xs ${taskOverdue ? 'text-red-500 font-semibold' : 'text-[var(--ink-400)]'}`}>
                              <Calendar size={11} />
                              {taskOverdue ? 'Overdue · ' : ''}{formatDateShort(task.due_date)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status-only actions for member */}
                          {task.status === 'backlog' && (
                            <button onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'inProgress') }}
                              className="text-xs px-2.5 py-1 bg-[var(--primary)] text-white font-medium rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors">
                              Start
                            </button>
                          )}
                          {task.status === 'inProgress' && !task.has_active_revision && (
                            <button onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'done') }}
                              className="text-xs px-2.5 py-1 bg-green-500 text-white font-medium rounded-[var(--r-sm)] hover:bg-green-600 transition-colors">
                              Done
                            </button>
                          )}
                          {/* Issue button */}
                          <button
                            onClick={e => { e.stopPropagation(); setShowRaiseIssue(true) }}
                            className="text-xs px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-[var(--r-sm)] hover:bg-amber-100 transition-colors"
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
              <h2 className="text-base font-bold text-[var(--ink-900)]">My Issues</h2>
              <button
                onClick={() => setShowRaiseIssue(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-[var(--r-sm)] hover:bg-amber-100 transition-colors"
              >
                <Plus size={12} /> Raise New Issue
              </button>
            </div>
            {issuesLoading ? (
              <SkeletonCard count={2} />
            ) : myIssues.length === 0 ? (
              <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-8 text-center">
                <AlertCircle size={32} className="mx-auto text-[var(--ink-400)] mb-2" />
                <p className="text-sm text-[var(--ink-400)]">No issues raised yet</p>
              </div>
            ) : (
              <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] divide-y divide-[var(--line-1)] overflow-hidden">
                {myIssues.map(issue => (
                  <button
                    key={issue.id}
                    onClick={() => setOpenIssue(issue)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--ink-900)] truncate">{issue.title}</p>
                      <p className="text-xs text-[var(--ink-400)] mt-0.5 truncate">{issue.entity_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[issue.status] || 'bg-[var(--surface-2)] text-[var(--ink-700)]'}`}>
                        {STATUS_LABEL[issue.status] || issue.status}
                      </span>
                      <span className="text-[11px] text-[var(--ink-400)]">{timeAgo(issue.updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-72 xl:w-80 2xl:w-96 shrink-0 space-y-4">
          {/* Personal To-Do Widget */}
          <TodoWidget />

          {/* My Projects */}
          <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--line-1)]">
              <h3 className="text-sm font-bold text-[var(--ink-900)]">My Projects</h3>
            </div>
            <div className="p-3 space-y-2">
              {projLoading ? (
                <SkeletonCard count={2} />
              ) : projects.length === 0 ? (
                <p className="text-xs text-[var(--ink-400)] text-center py-4">Not on any projects yet</p>
              ) : projects.map(project => (
                <div key={project.id}
                  onClick={() => navigate(`/app/projects/${project.id}`)}
                  className="p-3 rounded-[var(--r-lg)] border border-[var(--line-1)] hover:border-[var(--primary)]/30 hover:bg-[var(--surface-2)] cursor-pointer transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-bold text-[var(--ink-900)] group-hover:text-[var(--primary)] transition-colors truncate">
                      {project.name}
                    </p>
                    <StatusBadge status={project.status} />
                  </div>
                  <ProgressBar value={project.progress} showLabel size="sm" />
                  {project.client && <p className="text-[10px] text-[var(--ink-400)] mt-1">{project.client}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Completed Tasks */}
          {done > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--line-1)]">
                <h3 className="text-sm font-bold text-[var(--ink-900)]">Completed ({done})</h3>
              </div>
              <div className="divide-y divide-[var(--line-1)] max-h-48 overflow-y-auto">
                {myTasks.filter(t => t.status === 'done').map(task => (
                  <div key={task.id} className="flex items-start gap-2 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                    <CheckCheck size={14} className="text-[var(--primary)] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--ink-500)] line-through truncate">{task.title}</p>
                      {task.project_name && <p className="text-[10px] text-[var(--ink-400)]">{task.project_name}</p>}
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

      {/* Revision view modal — read-only, member can only see feedback and mark done */}
      {selectedTask && (
        <RevisionViewModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onMarkDone={async () => {
            try {
              await handleStatusChange(selectedTask.id, 'done')
              setSelectedTask(null)
            } catch { /* toast already shown */ }
          }}
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
          loading={taskLoading}
        />
      )}
    </div>
  )
}
