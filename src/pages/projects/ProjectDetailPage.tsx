import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Calendar, User, Building2, ExternalLink, AlertCircle, Plus, CheckCircle2, Circle, ListTodo } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useTasks } from '../../hooks/useTasks'
import { useIssues } from '../../hooks/useIssues'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import type { TodoItem } from '../../types'
import { ProgressBar } from '../../shared/ProgressBar'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { Tabs } from '../../shared/Tabs'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { KanbanView } from '../tasks/KanbanView'
import { ProjectFiles } from './ProjectFiles'
import { ProjectSOP } from './ProjectSOP'
import { ProjectMembers } from './ProjectMembers'
import { EditProjectModal } from '../../modals/EditProjectModal'
import { RaiseIssueModal } from '../../modals/RaiseIssueModal'
import { IssueDetailDrawer } from '../../modals/IssueDetailDrawer'
import { friendlyError, formatDate, isOverdue, timeAgo } from '../../utils/helpers'
import type { TaskStatus, Issue } from '../../types'

const STATUS_STYLE: Record<string, string> = {
  open:      'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
  in_review: 'bg-[var(--primary-50)] text-[var(--primary-700)] ring-1 ring-inset ring-[var(--primary-200)]',
  resolved:  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
  closed:    'bg-[var(--surface-2)] text-[var(--ink-500)] ring-1 ring-inset ring-[var(--line-2)]',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_review: 'In Review',
  resolved: 'Resolved',
  closed: 'Closed',
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-500',
  medium: 'bg-amber-500',
  low:    'bg-[var(--ink-400)]',
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const { projects, archiveProject, deleteProject } = useProjects()
  const { tasks, updateTaskStatus } = useTasks({ projectId: id })
  const { issues, fetchIssues } = useIssues(id)
  const toast = useToast()
  const [tab, setTab] = useState('board')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showRaiseIssue, setShowRaiseIssue] = useState(false)
  const [openIssue, setOpenIssue] = useState<Issue | null>(null)

  const [projectTodos, setProjectTodos] = useState<TodoItem[]>([])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      // project_id column may not exist in DB yet — both queries will 400 if so; silently show empty
      let { data, error } = await supabase
        .from('personal_todos')
        .select('*, owner:profiles!personal_todos_user_id_fkey(id, name, department)')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
      if (error) {
        // Retry without FK join (FK name mismatch)
        ;({ data, error } = await supabase
          .from('personal_todos')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false }))
      }
      if (!error && data) setProjectTodos(data as TodoItem[])
      // If still error: project_id column missing from DB — show empty state
    }
    load()
  }, [id])

  const toggleProjectTodo = async (todo: TodoItem) => {
    const next = todo.status === 'pending' ? 'completed' : 'pending'
    const { error } = await supabase.from('personal_todos').update({ status: next }).eq('id', todo.id)
    if (!error) setProjectTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: next } : t))
  }

  const project = projects.find(p => p.id === id)
  const isMember = currentUser?.role === 'member'
  const canEdit = !isMember
  const projectOverdue = project && (project.is_overdue || (project.due_date && isOverdue(project.due_date)))

  if (!id) return null
  if (!project && projects.length > 0) return (
    <div className="flex flex-col items-center justify-center h-64">
      <p className="text-[var(--ink-500)] text-[14px]">Project not found</p>
      <Link to="/app/dashboard" className="mt-2 text-[var(--primary)] text-[13px] hover:text-[var(--primary-hi)] hover:underline">Back to Dashboard</Link>
    </div>
  )

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try { await updateTaskStatus(taskId, status) }
    catch (err) { toast.error(friendlyError(err)) }
  }

  const handleDelete = async () => {
    await deleteProject(project!.id, project!.name)
    toast.success('Project deleted')
    navigate('/app/dashboard')
  }

  const handleArchive = async () => {
    await archiveProject(project!.id, project!.name)
    toast.success('Project archived')
    navigate('/app/dashboard')
  }

  const todo = tasks.filter(t => t.status === 'backlog').length
  const active = tasks.filter(t => t.status === 'inProgress').length
  const done = tasks.filter(t => t.status === 'done').length

  const tabs = [
    { id: 'board', label: 'Board' },
    { id: 'files', label: 'Files' },
    { id: 'sop', label: 'SOP' },
    { id: 'members', label: 'Members' },
    { id: 'issues', label: `Issues${issues.length > 0 ? ` (${issues.length})` : ''}` },
    { id: 'todos', label: `Todos${projectTodos.length > 0 ? ` (${projectTodos.length})` : ''}` },
  ]

  if (!project) {
    return (
      <div className="px-4 py-8 max-w-[1280px] mx-auto">
        <div className="space-y-4"><div className="skeleton h-8 w-48 rounded" /><div className="skeleton h-40 rounded-xl" /></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1440px] mx-auto animate-reveal-up">
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-500)] hover:text-[var(--ink-900)] mb-5 transition-colors">
        <ArrowLeft size={14} strokeWidth={1.8} /> Back to Projects
      </button>

      {/* Header */}
      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5 md:p-6 mb-5 shadow-[var(--shadow-xs)]">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <span className="eyebrow">— Project · {project.key}</span>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <h1 className="font-display text-[22px] md:text-[24px] font-semibold text-[var(--ink-900)] tracking-[-0.02em]">{project.name}</h1>
              <PriorityBadge priority={project.priority} />
              <StatusBadge status={project.status} />
              {projectOverdue && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 ring-1 ring-inset ring-red-200 px-2 py-0.5 rounded-full dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60 dark:ring-red-900/60">
                  <AlertCircle size={10} strokeWidth={2} /> Overdue
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="relative shrink-0">
              <button onClick={() => setMenuOpen(p => !p)}
                className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-900)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors"
                aria-label="Project menu">
                <MoreHorizontal size={16} strokeWidth={1.8} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 glass-strong border border-[var(--line-1)] rounded-[var(--r-md)] shadow-[var(--shadow-lg)] z-20 py-1 overflow-hidden">
                  <button onClick={() => { setShowEdit(true); setMenuOpen(false) }}
                    className="w-full text-left px-3.5 py-2 text-[13px] text-[var(--ink-700)] hover:bg-[var(--surface-2)] transition-colors">Edit</button>
                  <button onClick={() => { setShowArchive(true); setMenuOpen(false) }}
                    className="w-full text-left px-3.5 py-2 text-[13px] text-[var(--ink-700)] hover:bg-[var(--surface-2)] transition-colors">Archive</button>
                  <div className="border-t border-[var(--line-1)] my-1" />
                  <button onClick={() => { setShowDelete(true); setMenuOpen(false) }}
                    className="w-full text-left px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">Delete</button>
                </div>
              )}
            </div>
          )}
        </div>

        {project.client && <p className="text-[13px] text-[var(--ink-500)] mb-3 mt-1">{project.client}</p>}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[var(--ink-500)] mb-5 mt-4">
          {project.due_date && (
            <span className={`inline-flex items-center gap-1.5 ${projectOverdue ? 'text-red-500 font-medium' : ''}`}>
              <Calendar size={13} strokeWidth={1.8} /> <span className="font-mono tabular-nums">{formatDate(project.due_date)}</span>
            </span>
          )}
          {project.owner && (
            <span className="inline-flex items-center gap-1.5">
              <User size={13} strokeWidth={1.8} /> {project.owner.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={13} strokeWidth={1.8} /> {project.department}
          </span>
          {project.reference_link && (
            <a href={project.reference_link} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:text-[var(--primary-hi)] transition-colors">
              <ExternalLink size={13} strokeWidth={1.8} /> Reference
            </a>
          )}
        </div>

        <div className="mb-2">
          <div className="flex justify-between mb-1.5">
            <span className="eyebrow">Progress</span>
            <span className="text-[11px] font-semibold font-mono tabular-nums text-[var(--ink-700)]">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} size="lg" color={projectOverdue ? '#ef4444' : undefined} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mt-3 font-mono tabular-nums">
          <span className="text-amber-600"><span className="font-semibold">{todo}</span> todo</span>
          <span className="text-[var(--primary)]"><span className="font-semibold">{active}</span> active</span>
          <span className="text-emerald-600"><span className="font-semibold">{done}</span> done</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-5" />

      {/* Tab content */}
      {tab === 'board' && (
        <KanbanView tasks={tasks} projectId={project.id} onStatusChange={handleStatusChange} />
      )}
      {tab === 'files' && <ProjectFiles projectId={project.id} />}
      {tab === 'sop' && <ProjectSOP projectId={project.id} sop={project.sop} />}
      {tab === 'members' && <ProjectMembers projectId={project.id} department={project.department} />}
      {tab === 'issues' && (
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden shadow-[var(--shadow-xs)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-1)]">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} strokeWidth={1.8} className="text-amber-500" />
              <h2 className="font-display text-[15px] font-semibold text-[var(--ink-900)] tracking-[-0.01em]">Issues <span className="font-mono tabular-nums text-[var(--ink-500)]">({issues.length})</span></h2>
            </div>
            {isMember && (
              <button
                onClick={() => setShowRaiseIssue(true)}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-[var(--r-sm)] hover:bg-amber-100 transition-colors"
              >
                <Plus size={12} strokeWidth={2} /> Raise Issue
              </button>
            )}
          </div>
          {issues.length === 0 ? (
            <div className="py-12 text-center text-[var(--ink-400)]">
              <AlertCircle size={32} strokeWidth={1.4} className="mx-auto mb-3 opacity-30" />
              <p className="text-[13px]">No issues raised for this project</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--line-1)]">
              {issues.map(issue => (
                <button
                  key={issue.id}
                  onClick={() => setOpenIssue(issue)}
                  className="w-full text-left flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--surface-2)]/60 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority] || 'bg-[var(--ink-400)]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--ink-900)] truncate">{issue.title}</p>
                    <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{issue.raised_by_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[issue.status] || STATUS_STYLE.closed}`}>
                      {STATUS_LABEL[issue.status] || issue.status}
                    </span>
                    <span className="text-[11px] text-[var(--ink-400)] font-mono tabular-nums">{timeAgo(issue.updated_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <EditProjectModal open={showEdit} onClose={() => setShowEdit(false)} project={project} />
      )}

      <ConfirmDialog
        open={showArchive}
        onClose={() => setShowArchive(false)}
        onConfirm={handleArchive}
        title="Archive Project"
        description={`Archive "${project.name}"? It will be hidden from the main view but preserved.`}
        confirmLabel="Archive"
        variant="warning"
      />

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        description={`Permanently delete "${project.name}"? All tasks and files will also be deleted.`}
        confirmLabel="Delete Project"
        variant="danger"
        typeToConfirm={project.name}
      />

      <RaiseIssueModal
        open={showRaiseIssue}
        onClose={() => setShowRaiseIssue(false)}
        presetEntity={{ type: 'project', id: project.id, name: project.name }}
      />

      {tab === 'todos' && (
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--line-1)]">
            <ListTodo size={15} strokeWidth={1.8} className="text-[var(--primary)]" />
            <h2 className="font-display text-[15px] font-semibold text-[var(--ink-900)] tracking-[-0.01em]">Linked Todos <span className="font-mono tabular-nums text-[var(--ink-500)]">({projectTodos.length})</span></h2>
          </div>
          {projectTodos.length === 0 ? (
            <div className="py-12 text-center text-[var(--ink-400)]">
              <ListTodo size={32} strokeWidth={1.4} className="mx-auto mb-3 opacity-30" />
              <p className="text-[13px]">No todos linked to this project</p>
              <p className="text-[11px] mt-1 text-[var(--ink-400)]">Link a personal todo to this project from the Todos page</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--line-1)]">
              {projectTodos.map(todo => {
                const overdue = todo.due_date && todo.status !== 'completed' && new Date(todo.due_date) < new Date()
                return (
                  <div key={todo.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--surface-2)]/60 transition-colors">
                    <button
                      onClick={() => toggleProjectTodo(todo)}
                      className="mt-0.5 shrink-0 text-[var(--ink-400)] hover:text-[var(--primary)] transition-colors"
                      aria-label={todo.status === 'completed' ? 'Mark pending' : 'Mark completed'}
                    >
                      {todo.status === 'completed'
                        ? <CheckCircle2 size={17} strokeWidth={1.8} className="text-[var(--primary)]" />
                        : <Circle size={17} strokeWidth={1.8} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium ${todo.status === 'completed' ? 'line-through text-[var(--ink-400)]' : 'text-[var(--ink-900)]'}`}>
                        {todo.title}
                      </p>
                      {todo.description && (
                        <p className="text-[11px] text-[var(--ink-400)] mt-0.5 truncate">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {(todo as any).owner?.name && (
                          <span className="text-[11px] text-[var(--ink-400)]">{(todo as any).owner.name}</span>
                        )}
                        {todo.due_date && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums ${overdue ? 'text-red-500 font-medium' : 'text-[var(--ink-400)]'}`}>
                            <Calendar size={10} strokeWidth={1.8} /> {formatDate(todo.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${
                      todo.status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60' : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60'
                    }`}>
                      {todo.status === 'completed' ? 'Done' : 'Pending'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {openIssue && (
        <IssueDetailDrawer
          issue={openIssue}
          onClose={() => setOpenIssue(null)}
          onUpdate={fetchIssues}
          readOnly={isMember}
        />
      )}
    </div>
  )
}
