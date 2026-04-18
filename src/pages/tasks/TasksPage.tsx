import { useState, useMemo } from 'react'
import { LayoutList, LayoutGrid, CheckSquare, Users } from 'lucide-react'
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
    : {}

  const { tasks, loading, updateTaskStatus, bulkUpdateStatus, bulkDelete, bulkReassign } = useTasks(filters)
  const { members } = useTeam()
  const toast = useToast()
  const [view, setView] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [filterAssignedBy, setFilterAssignedBy] = useState<string>('all')
  const [taskTab, setTaskTab] = useState<'team' | 'mine'>('team')

  const filtered = useMemo(() => tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (memberFilter && t.assignee_id !== memberFilter) return false
    if (filterAssignedBy !== 'all' && t.created_by_id !== filterAssignedBy) return false
    return true
  }), [tasks, search, statusFilter, priorityFilter, memberFilter, filterAssignedBy])

  const displayedTasks = useMemo(() => {
    if (currentUser?.role !== 'teamLead') return filtered
    if (taskTab === 'mine') return filtered.filter(t => t.assignee_id === currentUser.id)
    return filtered.filter(t => t.assignee_id !== currentUser.id)
  }, [filtered, taskTab, currentUser])

  const uniqueCreators = useMemo(() => {
    const seen = new Set<string>()
    return tasks
      .filter(t => t.creator && !seen.has(t.creator.id) && seen.add(t.creator.id))
      .map(t => t.creator!)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tasks])

  const active = displayedTasks.filter(t => t.status === 'inProgress').length
  const done = displayedTasks.filter(t => t.status === 'done').length

  const title = currentUser?.role === 'member'
    ? 'My Tasks'
    : currentUser?.role === 'teamLead'
    ? `${currentUser.department} Tasks`
    : 'All Tasks'

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try { await updateTaskStatus(id, status) }
    catch (err) { toast.error(friendlyError(err)) }
  }

  const selectCls = 'text-[13px] border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 cursor-pointer transition-colors'

  return (
    <div className="px-4 py-4 md:px-6 md:py-5 xl:py-6 max-w-[1440px] mx-auto animate-reveal-up">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <span className="eyebrow">— Operations · Tasks</span>
          <h1 className="font-display text-[clamp(1.5rem,2.2vw,1.875rem)] font-semibold tracking-[-0.02em] text-[var(--ink-900)] mt-1.5">{title}</h1>
          <p className="text-[13px] text-[var(--ink-500)] mt-1 font-mono tabular-nums">
            {displayedTasks.length} <span className="not-italic">shown · </span>
            <span className="text-[var(--primary)]">{active}</span> active · <span className="text-emerald-600">{done}</span> done
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-sm)] shrink-0">
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded-[var(--r-xs)] transition-all ${view === 'table' ? 'bg-[var(--surface-1)] text-[var(--ink-900)] shadow-[var(--shadow-xs)]' : 'text-[var(--ink-400)] hover:text-[var(--ink-900)]'}`}
            title="Table view"
            aria-label="Table view"
          >
            <LayoutList size={15} strokeWidth={1.8} />
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`p-1.5 rounded-[var(--r-xs)] transition-all ${view === 'kanban' ? 'bg-[var(--surface-1)] text-[var(--ink-900)] shadow-[var(--shadow-xs)]' : 'text-[var(--ink-400)] hover:text-[var(--ink-900)]'}`}
            title="Kanban view"
            aria-label="Kanban view"
          >
            <LayoutGrid size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Team Lead tabs */}
      {currentUser?.role === 'teamLead' && (
        <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-md)] p-1 w-fit mb-4">
          {(['team', 'mine'] as const).map(tab => {
            const count = tab === 'team'
              ? filtered.filter(t => t.assignee_id !== currentUser.id).length
              : filtered.filter(t => t.assignee_id === currentUser.id).length
            const Icon = tab === 'team' ? Users : CheckSquare
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setTaskTab(tab)}
                className={`px-3.5 py-1.5 rounded-[var(--r-sm)] text-[13px] font-medium transition-all inline-flex items-center gap-1.5 ${
                  taskTab === tab
                    ? 'bg-[var(--surface-1)] text-[var(--ink-900)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                }`}
              >
                <Icon size={13} strokeWidth={1.8} />
                {tab === 'team' ? 'Team Tasks' : 'My Tasks'}
                <span className={`font-mono tabular-nums text-[11px] rounded-full px-1.5 py-0.5 ${
                  taskTab === tab ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-3)] text-[var(--ink-500)]'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks..." className="w-full sm:flex-1 sm:min-w-[240px]" />
        <div className="flex items-center gap-2 flex-wrap">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="">All Status</option>
            <option value="backlog">Backlog</option>
            <option value="inProgress">In Progress</option>
            <option value="onHold">On Hold</option>
            <option value="done">Done</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={selectCls}>
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {currentUser?.role !== 'member' && (
            <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)} className={selectCls}>
              <option value="">All Members</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          {currentUser?.role !== 'member' && uniqueCreators.length > 0 && (
            <select value={filterAssignedBy} onChange={e => setFilterAssignedBy(e.target.value)} className={selectCls}>
              <option value="all">Assigned By: All</option>
              {uniqueCreators.map(creator => (
                <option key={creator.id} value={creator.id}>{creator.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table or Kanban */}
      {view === 'table' ? (
        <>
          <div className="hidden md:block bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden shadow-[var(--shadow-xs)]">
            <TableView
              tasks={displayedTasks}
              loading={loading}
              onBulkDelete={bulkDelete}
              onBulkReassign={bulkReassign}
              onBulkDone={ids => bulkUpdateStatus(ids, 'done')}
              onStatusChange={handleStatusChange}
            />
          </div>

          <div className="md:hidden space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-md)] p-4 h-20 skeleton" />)}
              </div>
            ) : displayedTasks.length === 0 ? (
              <div className="text-center text-[13px] text-[var(--ink-400)] py-12">No tasks found</div>
            ) : displayedTasks.map(task => (
              <div key={task.id} className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-md)] p-4 shadow-[var(--shadow-xs)]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="inline-block mb-1"><PriorityBadgeInline priority={task.priority} /></span>
                    <p className="text-[13px] font-medium text-[var(--ink-900)]">{task.title}</p>
                    {task.project_name && <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{task.project_name}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {task.assignee_id && <span className="text-[11px] text-[var(--ink-500)] truncate">{task.assignee_name}</span>}
                    {task.due_date && <span className="text-[11px] text-[var(--ink-400)] font-mono tabular-nums">{task.due_date}</span>}
                  </div>
                  <select value={task.status} onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    className="text-[11px] border border-[var(--line-1)] rounded-[var(--r-xs)] px-2 py-1 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none">
                    <option value="backlog">Backlog</option>
                    <option value="inProgress">In Progress</option>
                    <option value="onHold">On Hold</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <KanbanView
          tasks={displayedTasks}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

function PriorityBadgeInline({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
    high:     'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60',
    medium:   'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
    low:      'bg-[var(--surface-2)] text-[var(--ink-500)] ring-[var(--line-2)]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-[-0.005em] ring-1 ring-inset ${styles[priority] || styles.low}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}
