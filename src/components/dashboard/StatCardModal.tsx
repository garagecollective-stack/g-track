import { useState, useMemo } from 'react'
import { X, AlertTriangle, Search } from 'lucide-react'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { EditTaskModal } from '../../modals/EditTaskModal'
import { useNavigate } from 'react-router-dom'
import type { Task, Project } from '../../types'

interface StatCardModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'projects' | 'tasks' | 'overdue' | 'completed'
  title: string
  items: (Task | Project)[]
  loading?: boolean
}

function isTask(item: Task | Project): item is Task {
  return 'assignee_id' in item
}

function getItemTitle(item: Task | Project): string {
  if (isTask(item)) return item.title
  return (item as Project).name
}

export function StatCardModal({ isOpen, onClose, type, title, items, loading }: StatCardModalProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [editTask, setEditTask] = useState<Task | null>(null)

  const filtered = useMemo(() => {
    return items.filter(item => {
      const itemTitle = getItemTitle(item)
      if (search && !itemTitle.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter && item.status !== statusFilter) return false
      if (priorityFilter && item.priority !== priorityFilter) return false
      return true
    })
  }, [items, search, statusFilter, priorityFilter])

  if (!isOpen) return null

  const handleItemClick = (item: Task | Project) => {
    if (isTask(item)) {
      setEditTask(item)
    } else {
      navigate(`/app/projects/${item.id}`)
      onClose()
    }
  }

  const showPriority = type !== 'projects'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex-1">
              {title}
              <span className="ml-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {filtered.length}
              </span>
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
              <X size={16} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0A5540] bg-white"
              />
            </div>
            {type !== 'projects' && (
              <>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#0A5540]"
                >
                  <option value="">Status ▾</option>
                  <option value="backlog">Backlog</option>
                  <option value="inProgress">In Progress</option>
                  <option value="onHold">On Hold</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#0A5540]"
                >
                  <option value="">Priority ▾</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No items found</div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      {type === 'projects' ? 'Project' : 'Task'}
                    </th>
                    {type !== 'projects' && (
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Project
                      </th>
                    )}
                    {showPriority && (
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Priority
                      </th>
                    )}
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const isTaskItem = isTask(item)
                    const isOverdueItem = type === 'overdue'
                    const isDoneItem = type === 'completed'
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isOverdueItem && (
                              <AlertTriangle size={12} className="text-red-500 shrink-0" />
                            )}
                            <span className={`text-sm font-medium text-gray-900 ${isDoneItem ? 'line-through text-gray-400' : ''}`}>
                              {getItemTitle(item)}
                            </span>
                            {isDoneItem && (
                              <span className="ml-1 text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                                Done
                              </span>
                            )}
                          </div>
                          {isTaskItem && item.assignee_name && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.assignee_name}</p>
                          )}
                        </td>
                        {!isTaskItem ? null : (
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {item.project_name ? (
                              <span className="text-xs bg-gray-100 text-gray-600 rounded-md px-2 py-0.5">
                                {item.project_name}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                        {showPriority && (
                          <td className="px-4 py-3 hidden md:table-cell">
                            <PriorityBadge priority={item.priority} />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {items.length}</p>
          </div>
        </div>
      </div>

      {/* Edit task modal (for task items) */}
      {editTask && (
        <EditTaskModal
          open={!!editTask}
          onClose={() => setEditTask(null)}
          task={editTask}
        />
      )}
    </>
  )
}
