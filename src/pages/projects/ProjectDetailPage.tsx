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

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
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
      <p className="text-gray-500">Project not found</p>
      <Link to="/app/dashboard" className="mt-2 text-[#0A5540] text-sm hover:underline">Back to Dashboard</Link>
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
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to Projects
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            <span className="font-mono text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">{project.key}</span>
            <PriorityBadge priority={project.priority} />
            <StatusBadge status={project.status} />
            {projectOverdue && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                <AlertCircle size={11} /> Overdue
              </span>
            )}
          </div>
          {canEdit && (
            <div className="relative shrink-0">
              <button onClick={() => setMenuOpen(p => !p)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                  <button onClick={() => { setShowEdit(true); setMenuOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
                  <button onClick={() => { setShowArchive(true); setMenuOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Archive</button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => { setShowDelete(true); setMenuOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">Delete</button>
                </div>
              )}
            </div>
          )}
        </div>

        {project.client && <p className="text-sm text-gray-500 mb-3">{project.client}</p>}

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
          {project.due_date && (
            <span className={`flex items-center gap-1.5 ${projectOverdue ? 'text-red-500 font-medium' : ''}`}>
              <Calendar size={14} /> Due {formatDate(project.due_date)}
            </span>
          )}
          {project.owner && (
            <span className="flex items-center gap-1.5">
              <User size={14} /> {project.owner.name}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Building2 size={14} /> {project.department}
          </span>
          {project.reference_link && (
            <a href={project.reference_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#0A5540] hover:underline">
              <ExternalLink size={14} /> Reference
            </a>
          )}
        </div>

        <div className="mb-2">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-semibold text-gray-600" style={{ fontFamily: 'DM Mono' }}>{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} size="lg" color={projectOverdue ? '#ef4444' : undefined} />
        </div>

        <div className="flex gap-4 text-xs mt-2">
          <span className="text-orange-500 font-medium">{todo} tasks todo</span>
          <span className="text-blue-500 font-medium">{active} active</span>
          <span className="text-green-500 font-medium">{done} done</span>
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
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              <h2 className="text-base font-bold text-gray-900">Issues ({issues.length})</h2>
            </div>
            {isMember && (
              <button
                onClick={() => setShowRaiseIssue(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Plus size={12} /> Raise Issue
              </button>
            )}
          </div>
          {issues.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <AlertCircle size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No issues raised for this project</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {issues.map(issue => (
                <button
                  key={issue.id}
                  onClick={() => setOpenIssue(issue)}
                  className="w-full text-left flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority] || 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{issue.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{issue.raised_by_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[issue.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[issue.status] || issue.status}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(issue.updated_at)}</span>
                    <AlertCircle size={14} className="text-gray-300" />
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
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <ListTodo size={16} className="text-[#0A5540]" />
            <h2 className="text-base font-bold text-gray-900">Linked Todos ({projectTodos.length})</h2>
          </div>
          {projectTodos.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <ListTodo size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No todos linked to this project</p>
              <p className="text-xs mt-1 text-gray-300">Link a personal todo to this project from the Todos page</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {projectTodos.map(todo => {
                const overdue = todo.due_date && todo.status !== 'completed' && new Date(todo.due_date) < new Date()
                return (
                  <div key={todo.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => toggleProjectTodo(todo)}
                      className="mt-0.5 shrink-0 text-gray-400 hover:text-[#0A5540] transition-colors"
                    >
                      {todo.status === 'completed'
                        ? <CheckCircle2 size={18} className="text-[#0A5540]" />
                        : <Circle size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${todo.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {todo.title}
                      </p>
                      {todo.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {(todo as any).owner?.name && (
                          <span className="text-xs text-gray-400">{(todo as any).owner.name}</span>
                        )}
                        {todo.due_date && (
                          <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            <Calendar size={11} /> {formatDate(todo.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      todo.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
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
