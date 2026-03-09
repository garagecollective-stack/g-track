import { useState, useMemo } from 'react'
import { LayoutList, LayoutGrid } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTasks } from '../../hooks/useTasks'
import { useTeam } from '../../hooks/useTeam'
import { SearchInput } from '../../shared/SearchInput'
import { TableView } from './TableView'
import { KanbanView } from './KanbanView'
import { useToast } from '../../hooks/useToast'
import { friendlyError } from '../../utils/helpers'
import type { TaskStatus } from '../../types'

type ViewMode = 'table' | 'kanban'

export function TasksPage() {
  const { currentUser } = useApp()
  const filters = currentUser?.role === 'member'
    ? { assigneeId: currentUser.id }
    : currentUser?.role === 'teamLead'
    ? { department: currentUser.department || undefined }
    : {}

  const { tasks, loading, updateTaskStatus, bulkUpdateStatus, bulkDelete, bulkReassign } = useTasks(filters)
  const { members } = useTeam()
  const toast = useToast()
  const [view, setView] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [memberFilter, setMemberFilter] = useState('')

  const filtered = useMemo(() => tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (memberFilter && t.assignee_id !== memberFilter) return false
    return true
  }), [tasks, search, statusFilter, priorityFilter, memberFilter])

  const active = filtered.filter(t => t.status === 'inProgress').length
  const done = filtered.filter(t => t.status === 'done').length

  const title = currentUser?.role === 'member'
    ? 'My Tasks'
    : currentUser?.role === 'teamLead'
    ? `${currentUser.department} Tasks`
    : 'All Tasks'

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try { await updateTaskStatus(id, status) }
    catch (err) { toast.error(friendlyError(err)) }
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.5px' }}>{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} tasks shown</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            title="Table view"
          >
            <LayoutList size={16} />
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            title="Kanban view"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks..." className="flex-1 min-w-[160px]" />
        <div className="flex items-center gap-2 flex-wrap">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none">
            <option value="">All Status</option>
            <option value="backlog">Backlog</option>
            <option value="inProgress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none">
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {currentUser?.role !== 'member' && (
            <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none">
              <option value="">All Members</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <span className="text-sm text-gray-500 ml-1">
            <span className="text-blue-600 font-medium">{active}</span> active ·{' '}
            <span className="text-green-600 font-medium">{done}</span> done
          </span>
        </div>
      </div>

      {/* Table or Kanban */}
      {view === 'table' ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-xl overflow-hidden">
            <TableView
              tasks={filtered}
              loading={loading}
              onBulkDelete={bulkDelete}
              onBulkReassign={bulkReassign}
              onBulkDone={ids => bulkUpdateStatus(ids, 'done')}
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 h-20 skeleton" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-12">No tasks found</div>
            ) : filtered.map(task => (
              <div key={task.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="inline-block mb-1"><PriorityBadgeInline priority={task.priority} /></span>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.project_name && <p className="text-xs text-gray-400 mt-0.5">{task.project_name}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {task.assignee_id && <span className="text-xs text-gray-500">{task.assignee_name}</span>}
                    {task.due_date && <span className="text-xs text-gray-400">📅 {task.due_date}</span>}
                  </div>
                  <select value={task.status} onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none">
                    <option value="backlog">Backlog</option>
                    <option value="inProgress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <KanbanView
          tasks={filtered}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

function PriorityBadgeInline({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}
