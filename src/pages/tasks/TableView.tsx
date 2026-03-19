import { useState } from 'react'
import { Pencil, ArrowUp, ArrowDown, Circle, CircleDot, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Avatar } from '../../shared/Avatar'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { SkeletonRow } from '../../shared/SkeletonCard'
import { EditTaskModal } from '../../modals/EditTaskModal'
import { BulkReassignModal } from '../../modals/BulkReassignModal'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { RaiseIssueModal } from '../../modals/RaiseIssueModal'
import { isOverdue, formatDateShort } from '../../utils/helpers'
import type { Task } from '../../types'
import { useApp } from '../../context/AppContext'

type SortKey = 'title' | 'due_date' | null
type SortDir = 'asc' | 'desc'

interface Props {
  tasks: Task[]
  loading: boolean
  onBulkDelete: (ids: string[]) => Promise<void>
  onBulkReassign: (ids: string[], assigneeId: string, name?: string) => Promise<void>
  onBulkDone: (ids: string[]) => Promise<void>
  onStatusChange?: (id: string, status: Task['status']) => Promise<void>
}

function StatusIcon({ status }: { status: Task['status'] }) {
  if (status === 'done') return <CheckCircle2 size={16} className="text-green-500" />
  if (status === 'inProgress') return <CircleDot size={16} className="text-blue-500" />
  return <Circle size={16} className="text-gray-300" />
}

export function TableView({ tasks, loading, onBulkDelete, onBulkReassign, onBulkDone, onStatusChange }: Props) {
  const { currentUser } = useApp()
  const [selected, setSelected] = useState<string[]>([])
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showBulkReassign, setShowBulkReassign] = useState(false)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [showBulkDone, setShowBulkDone] = useState(false)
  const [issueTask, setIssueTask] = useState<Task | null>(null)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ taskId: string; title: string; status: Task['status'] } | null>(null)

  const isMember = currentUser?.role === 'member'
  const canBulkAction = !isMember

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...tasks].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey] || ''
    const bv = b[sortKey] || ''
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const toggleAll = () => setSelected(s => s.length === tasks.length ? [] : tasks.map(t => t.id))
  const toggleOne = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  // Member: next valid status transition
  const getMemberNextStatus = (status: Task['status']): { label: string; next: Task['status'] } | null => {
    if (status === 'backlog') return { label: 'Mark In Progress', next: 'inProgress' }
    if (status === 'inProgress') return { label: 'Mark Done', next: 'done' }
    return null
  }

  const statusLabel = (s: Task['status']) => {
    if (s === 'inProgress') return 'In Progress'
    if (s === 'done') return 'Done'
    return 'Backlog'
  }

  return (
    <>
      {/* Bulk action bar — hidden for members */}
      {selected.length > 0 && canBulkAction && (
        <div className="bg-[#edf8f4] border-b border-[#0A5540]/20 px-4 py-2.5 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">{selected.length} task{selected.length !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowBulkDone(true)}
              className="px-3 py-1.5 text-xs font-medium text-[#0A5540] bg-white border border-[#0A5540]/30 rounded-lg hover:bg-[#edf8f4] transition-colors">
              Mark Done
            </button>
            <button onClick={() => setShowBulkReassign(true)}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Reassign
            </button>
            <button onClick={() => setShowBulkDelete(true)}
              className="px-3 py-1.5 text-xs font-medium text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {canBulkAction && (
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={selected.length === tasks.length && tasks.length > 0}
                    onChange={toggleAll} className="accent-[#0A5540]" />
                </th>
              )}
              <th className="px-4 py-2.5 text-left">
                <button onClick={() => toggleSort('title')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                  Task <SortIcon col="title" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Project</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
              {(currentUser?.role === 'director' || currentUser?.role === 'teamLead') && (
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Assigned By</th>
              )}
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-4 py-2.5 text-left">
                <button onClick={() => toggleSort('due_date')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                  Due Date <SortIcon col="due_date" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRow count={8} />
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={(currentUser?.role === 'director' || currentUser?.role === 'teamLead') ? 9 : 8} className="py-16 text-center text-sm text-gray-400">No tasks found</td>
              </tr>
            ) : sorted.map(task => {
              const taskOverdue = (task.is_overdue || isOverdue(task.due_date)) && task.status !== 'done'
              const memberNext = isMember ? getMemberNextStatus(task.status) : null

              return (
                <tr key={task.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors group ${taskOverdue ? 'bg-red-50/40' : ''}`}>
                  {canBulkAction && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(task.id)} onChange={() => toggleOne(task.id)} className="accent-[#0A5540]" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={task.status} />
                      {isMember ? (
                        <span className="text-sm font-medium text-gray-900">{task.title}</span>
                      ) : (
                        <button onClick={() => setEditTask(task)}
                          className="text-sm font-medium text-gray-900 hover:text-[#0A5540] transition-colors text-left">
                          {task.title}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {task.project_name && (
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-md px-2 py-0.5">
                        {task.project_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {task.assignee_id ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignee_name || '?'} size="xs" />
                          <span className="text-sm text-gray-600">{task.assignee_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                      {/* Cross-dept badge for team leads */}
                      {currentUser?.role === 'teamLead' && task.department && task.department !== currentUser.department && (
                        <span
                          className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 font-medium w-fit"
                          title={`Assigned from ${task.department} department`}
                        >
                          ↔ {task.department}
                        </span>
                      )}
                    </div>
                  </td>
                  {(currentUser?.role === 'director' || currentUser?.role === 'teamLead') && (
                    <td className="px-4 py-3">
                      {task.creator ? (
                        task.creator.name === task.assignee_name ? (
                          <em className="text-xs text-gray-400">Self-assigned</em>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <Avatar name={task.creator.name} size="xs" />
                              <span className="text-sm text-gray-600">{task.creator.name}</span>
                            </div>
                            {currentUser?.role === 'teamLead' && task.creator.department && task.creator.department !== currentUser.department && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 font-medium w-fit">
                                {task.creator.department}
                              </span>
                            )}
                          </div>
                        )
                      ) : task.created_by_name ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.created_by_name} size="xs" />
                          <span className="text-sm text-gray-600">{task.created_by_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-sm flex items-center gap-1 ${taskOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {taskOverdue && <AlertTriangle size={12} />}
                      {task.due_date ? formatDateShort(task.due_date) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isMember ? (
                      task.status === 'done' ? (
                        <StatusBadge status={task.status} />
                      ) : memberNext ? (
                        <select
                          value={task.status}
                          onChange={e => setPendingStatusChange({ taskId: task.id, title: task.title, status: e.target.value as Task['status'] })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:border-[#0A5540]"
                        >
                          <option value={task.status} disabled>
                            {task.status === 'backlog' ? 'Backlog' : 'In Progress'}
                          </option>
                          <option value={memberNext.next}>{memberNext.label}</option>
                        </select>
                      ) : (
                        <StatusBadge status={task.status} />
                      )
                    ) : (
                      <StatusBadge status={task.status} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isMember ? (
                      <button
                        onClick={() => setIssueTask(task)}
                        className="text-xs px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
                        title="Raise Issue"
                      >
                        ⚠ Issue
                      </button>
                    ) : (
                      <button onClick={() => setEditTask(task)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 transition-all">
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Member: status change confirm */}
      <ConfirmDialog
        open={!!pendingStatusChange}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={async () => {
          if (pendingStatusChange) {
            await onStatusChange?.(pendingStatusChange.taskId, pendingStatusChange.status)
          }
        }}
        title="Update Task Status"
        description={`Mark "${pendingStatusChange?.title}" as ${statusLabel(pendingStatusChange?.status ?? 'backlog')}?`}
        confirmLabel="Update Status"
        variant="confirm"
      />

      {/* Bulk mark done */}
      <ConfirmDialog
        open={showBulkDone}
        onClose={() => setShowBulkDone(false)}
        onConfirm={async () => { await onBulkDone(selected); setSelected([]) }}
        title="Mark Tasks Done"
        description={`Mark ${selected.length} task${selected.length !== 1 ? 's' : ''} as done?`}
        confirmLabel="Mark Done"
        variant="confirm"
      />

      {!isMember && (
        <>
          <EditTaskModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
          <BulkReassignModal
            open={showBulkReassign}
            onClose={() => setShowBulkReassign(false)}
            taskIds={selected}
            onReassign={async (id, name) => { await onBulkReassign(selected, id, name); setSelected([]) }}
          />
          <ConfirmDialog
            open={showBulkDelete}
            onClose={() => setShowBulkDelete(false)}
            onConfirm={async () => { await onBulkDelete(selected); setSelected([]) }}
            title={`Delete ${selected.length} Tasks`}
            description="This will permanently delete the selected tasks. This cannot be undone."
            confirmLabel="Delete All"
            variant="danger"
          />
        </>
      )}

      {issueTask && (
        <RaiseIssueModal
          open={!!issueTask}
          onClose={() => setIssueTask(null)}
          presetEntity={{ type: 'task', id: issueTask.id, name: issueTask.title }}
        />
      )}
    </>
  )
}
