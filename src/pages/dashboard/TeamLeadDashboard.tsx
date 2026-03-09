import { useState } from 'react'
import { Folder, CheckSquare, Zap, CheckCheck, Plus, ListTodo } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useTasks } from '../../hooks/useTasks'
import { useTeam } from '../../hooks/useTeam'
import { Avatar } from '../../shared/Avatar'
import { ProgressBar } from '../../shared/ProgressBar'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { SkeletonCard } from '../../shared/SkeletonCard'
import { AssignTaskModal } from '../../modals/AssignTaskModal'
import { NewProjectModal } from '../../modals/NewProjectModal'
import { TodoWidget } from '../todos/TodoWidget'
import { useNavigate } from 'react-router-dom'

interface StatCardProps {
  icon: React.ElementType
  value: number
  label: string
  iconColor: string
  iconBg: string
}

function StatCard({ icon: Icon, value, label, iconColor, iconBg }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className="text-3xl font-black text-gray-900" style={{ fontFamily: 'DM Mono, monospace' }}>{value}</p>
      <p className="text-sm font-semibold text-gray-700 mt-0.5">{label}</p>
    </div>
  )
}

export function TeamLeadDashboard() {
  const { currentUser } = useApp()
  const dept = currentUser?.department || ''
  const { projects, loading: projLoading } = useProjects()
  const { tasks, loading: taskLoading, updateTaskStatus } = useTasks({ department: dept })
  const { members } = useTeam()
  const navigate = useNavigate()
  const [showAssignTask, setShowAssignTask] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)

  const deptProjects = projects.filter(p => p.department === dept)
  const deptMembers  = members.filter(m => m.department === dept)
  const activeTasks  = tasks.filter(t => t.status === 'inProgress').length
  const doneTasks    = tasks.filter(t => t.status === 'done').length

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900" style={{ letterSpacing: '-0.5px' }}>
            {dept} Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team, projects and tasks</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowAssignTask(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0A5540] bg-[#edf8f4] border border-[#0A5540]/20 rounded-lg hover:bg-[#d6f0e8] transition-colors">
            <ListTodo size={14} /> Assign Task
          </button>
          <button onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors shadow-sm">
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
        <StatCard icon={Folder}      value={deptProjects.length}                         label="Projects"    iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard icon={CheckSquare} value={tasks.length}                                label="Total Tasks" iconColor="text-blue-600"   iconBg="bg-blue-50"   />
        <StatCard icon={Zap}         value={activeTasks}                                 label="In Progress" iconColor="text-orange-500" iconBg="bg-orange-50" />
        <StatCard icon={CheckCheck}  value={doneTasks}                                   label="Completed"   iconColor="text-[#0A5540]"  iconBg="bg-[#edf8f4]" />
      </div>

      {/* Main 2-col layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Projects */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Department Projects</h2>
            </div>
            <div className="p-5 space-y-3">
              {projLoading ? (
                <SkeletonCard count={3} />
              ) : deptProjects.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Folder size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No projects yet</p>
                </div>
              ) : deptProjects.map(project => {
                const tc = project.task_counts || { todo: 0, active: 0, done: 0 }
                return (
                  <div key={project.id}
                    onClick={() => navigate(`/app/projects/${project.id}`)}
                    className="border border-gray-100 rounded-xl p-4 hover:border-[#0A5540]/30 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#0A5540] transition-colors">
                          {project.name}
                        </h3>
                        {project.client && <p className="text-xs text-gray-400 mt-0.5">{project.client}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={project.priority} />
                        <StatusBadge status={project.status} />
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="font-bold text-gray-700" style={{ fontFamily: 'DM Mono' }}>{project.progress}%</span>
                      </div>
                      <ProgressBar value={project.progress} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-medium">
                        <span className="text-orange-500">{tc.todo} todo</span>
                        <span className="text-blue-500">{tc.active} active</span>
                        <span className="text-green-500">{tc.done} done</span>
                      </div>
                      {project.members && (
                        <div className="flex">
                          {project.members.slice(0, 3).map((m, i) => (
                            <div key={m.id} className={`${i > 0 ? '-ml-1.5' : ''} ring-2 ring-white rounded-full`}>
                              <Avatar name={m.name} size="xs" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:w-72 xl:w-80 shrink-0 space-y-4">
          {/* Todo Widget */}
          <TodoWidget />

          {/* Team Members */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Team Members</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {deptMembers.map(member => {
                const mActive = tasks.filter(t => t.assignee_id === member.id && t.status === 'inProgress').length
                const mDone   = tasks.filter(t => t.assignee_id === member.id && t.status === 'done').length
                return (
                  <div key={member.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <Avatar name={member.name} size="md" status={member.user_status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400">{mActive} active · {mDone} done</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      member.user_status === 'active'  ? 'bg-green-50 text-green-600'
                      : member.user_status === 'away'  ? 'bg-yellow-50 text-yellow-600'
                      :                                  'bg-gray-100 text-gray-500'
                    }`}>
                      {member.user_status}
                    </span>
                  </div>
                )
              })}
              {deptMembers.length === 0 && <p className="px-4 py-4 text-sm text-gray-400 text-center">No members</p>}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Recent Tasks</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {taskLoading ? (
                <div className="p-3"><SkeletonCard count={3} /></div>
              ) : tasks.slice(0, 6).map(task => (
                <div key={task.id} className="flex items-center gap-2 px-4 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'critical' ? 'bg-red-500' :
                    task.priority === 'high'     ? 'bg-orange-500' :
                    task.priority === 'medium'   ? 'bg-yellow-400' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400">{task.assignee_name || '—'}</p>
                  </div>
                  <select
                    value={task.status}
                    onChange={e => updateTaskStatus(task.id, e.target.value as any)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#0A5540] bg-white text-gray-600 cursor-pointer"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="inProgress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              ))}
              {!taskLoading && tasks.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">No tasks yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AssignTaskModal open={showAssignTask} onClose={() => setShowAssignTask(false)} />
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />
    </div>
  )
}
