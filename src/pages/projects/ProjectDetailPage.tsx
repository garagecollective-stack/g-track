import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Calendar, User, Building2, ExternalLink } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useTasks } from '../../hooks/useTasks'
import { useToast } from '../../hooks/useToast'
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
import { friendlyError, formatDate } from '../../utils/helpers'
import type { TaskStatus } from '../../types'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const { projects, archiveProject, deleteProject } = useProjects()
  const { tasks, updateTaskStatus } = useTasks({ projectId: id })
  const toast = useToast()
  const [tab, setTab] = useState('board')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  const project = projects.find(p => p.id === id)
  const canEdit = currentUser?.role !== 'member'

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
            <span className="flex items-center gap-1.5">
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
          <ProgressBar value={project.progress} size="lg" />
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

      <EditProjectModal open={showEdit} onClose={() => setShowEdit(false)} project={project} />

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
    </div>
  )
}
