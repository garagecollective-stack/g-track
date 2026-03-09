import { CheckSquare, Zap, CheckCheck, AlertTriangle, Calendar, FolderKanban } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { ProgressBar } from '../../shared/ProgressBar'
import { SkeletonCard } from '../../shared/SkeletonCard'
import { TodoWidget } from '../todos/TodoWidget'
import { isOverdue, formatDateShort } from '../../utils/helpers'
import { useToast } from '../../hooks/useToast'
import { friendlyError } from '../../utils/helpers'
import { useNavigate } from 'react-router-dom'
import type { TaskStatus } from '../../types'

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
  const toast = useToast()
  const navigate = useNavigate()

  const myTasks    = tasks.filter(t => t.assignee_id === currentUser?.id)
  const inProgress = myTasks.filter(t => t.status === 'inProgress').length
  const done       = myTasks.filter(t => t.status === 'done').length
  const overdueCnt = myTasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length

  const urgentTasks = myTasks.filter(
    t => t.status !== 'done' && t.due_date &&
    new Date(t.due_date) <= new Date(Date.now() + 2 * 86400000)
  )

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try { await updateTaskStatus(id, status) }
    catch (err) { toast.error(friendlyError(err)) }
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900" style={{ letterSpacing: '-0.5px' }}>My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {currentUser?.name.split(' ')[0]}</p>
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
        <div className="flex-1 min-w-0">
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
                      taskOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:border-[#0A5540]/30 hover:shadow-sm'
                    }`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {task.title}
                        </p>
                        {task.project_name && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <FolderKanban size={11} /> {task.project_name}
                          </span>
                        )}
                        {task.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    <div className="flex items-center justify-between">
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
                        <select
                          value={task.status}
                          onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          onClick={e => e.stopPropagation()}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:border-[#0A5540]"
                        >
                          <option value="backlog">Backlog</option>
                          <option value="inProgress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
    </div>
  )
}
