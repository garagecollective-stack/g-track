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
  if (status === 'done') return <CheckCircle2 size={14} strokeWidth={1.8} className="text-emerald-500" />
  if (status === 'inProgress') return <CircleDot size={14} strokeWidth={1.8} className="text-[var(--primary)]" />
  return <Circle size={14} strokeWidth={1.8} className="text-[var(--ink-400)]" />
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

  const renderSortIcon = (col: SortKey) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  // Member: next valid status transition
  const getMemberNextStatus = (status: Task['status']): { label: string; next: Task['status'] } | null => {
    if (status === 'backlog') return { label: 'Mark In Progress', next: 'inProgress' }
    if (status === 'inProgress') return { label: 'Mark Done', next: 'done' }
    if (status === 'onHold') return { label: 'Resume', next: 'inProgress' }
    return null
  }

  const statusLabel = (s: Task['status']) => {
    if (s === 'inProgress') return 'In Progress'
    if (s === 'done') return 'Done'
    if (s === 'onHold') return 'On Hold'
    return 'Backlog'
  }

  // Mobile card view
  const renderMobileCardList = () => (
    <div className="space-y-2 p-3">
      {loading ? (
        [1,2,3].map(i => <div key={i} className="h-20 bg-[var(--surface-2)] rounded-[var(--r-md)] skeleton" />)
      ) : sorted.length === 0 ? (
        <p className="text-center text-[13px] text-[var(--ink-400)] py-12">No tasks found</p>
      ) : sorted.map(task => {
        const taskOverdue = (task.is_overdue || isOverdue(task.due_date)) && task.status !== 'done'
        const memberNext = isMember ? getMemberNextStatus(task.status) : null
        return (
          <div key={task.id}
            onClick={() => !isMember && setEditTask(task)}
            className={`bg-[var(--surface-1)] border rounded-[var(--r-md)] p-3.5 shadow-[var(--shadow-xs)] ${!isMember ? 'cursor-pointer active:bg-[var(--surface-2)]' : ''} ${
              taskOverdue ? 'border-red-200' : 'border-[var(--line-1)]'
            }`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <PriorityBadge priority={task.priority} />
                  {task.has_active_revision && (
                    <span className="text-[10px] bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 rounded-full px-2 py-0.5 font-medium">
                      Revision
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-semibold text-[var(--ink-900)] leading-tight">{task.title}</p>
                {task.project_name && (
                  <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{task.project_name}</p>
                )}
              </div>
              <StatusBadge status={task.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {task.assignee_name && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar name={task.assignee_name} size="xs" />
                    <span className="text-[11px] text-[var(--ink-500)] truncate max-w-[100px]">{task.assignee_name}</span>
                  </div>
                )}
                {task.due_date && (
                  <span className={`flex items-center gap-0.5 text-[11px] font-mono tabular-nums ${taskOverdue ? 'text-red-500 font-medium' : 'text-[var(--ink-400)]'}`}>
                    {taskOverdue && <AlertTriangle size={10} />}
                    {formatDateShort(task.due_date)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isMember ? (
                  <>
                    {task.status !== 'done' && memberNext && (
                      <button
                        onClick={e => { e.stopPropagation(); setPendingStatusChange({ taskId: task.id, title: task.title, status: memberNext.next }) }}
                        className="text-[11px] px-2.5 py-1 bg-[var(--primary)] text-white rounded-[var(--r-sm)] font-medium hover:bg-[var(--primary-hi)] shadow-[var(--shadow-xs)] transition-colors">
                        {memberNext.next === 'done' ? 'Done' : memberNext.next === 'inProgress' ? 'Start' : 'Resume'}
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setIssueTask(task) }}
                      className="text-[11px] px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-[var(--r-sm)] hover:bg-amber-100 transition-colors"
                      aria-label="Raise issue"
                    >
                      <AlertTriangle size={12} strokeWidth={1.8} />
                    </button>
                  </>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setEditTask(task) }}
                    className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-900)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors"
                    aria-label="Edit task"
                  >
                    <Pencil size={13} strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      {/* Bulk action bar */}
      {selected.length > 0 && canBulkAction && (
        <div className="bg-[var(--primary-50)] border-b border-[var(--primary-200)] px-4 py-2.5 flex items-center gap-4 animate-fade-scale-in">
          <span className="text-[13px] font-medium text-[var(--primary-700)]">
            <span className="font-mono tabular-nums font-semibold">{selected.length}</span> task{selected.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowBulkDone(true)}
              className="px-3 py-1.5 text-[12px] font-medium text-[var(--primary)] bg-[var(--surface-1)] border border-[var(--primary-200)] rounded-[var(--r-sm)] hover:bg-[var(--primary-50)] transition-colors">
              Mark Done
            </button>
            <button onClick={() => setShowBulkReassign(true)}
              className="px-3 py-1.5 text-[12px] font-medium text-[var(--ink-700)] bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors">
              Reassign
            </button>
            <button onClick={() => setShowBulkDelete(true)}
              className="px-3 py-1.5 text-[12px] font-medium text-red-500 bg-[var(--surface-1)] border border-red-200 rounded-[var(--r-sm)] hover:bg-red-50 transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="md:hidden">
        {renderMobileCardList()}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--surface-2)] border-b border-[var(--line-1)]">
              {canBulkAction && (
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={selected.length === tasks.length && tasks.length > 0}
                    onChange={toggleAll} className="accent-[var(--primary)]" />
                </th>
              )}
              <th className="px-4 py-2.5 text-left">
                <button onClick={() => toggleSort('title')}
                  className="flex items-center gap-1 eyebrow hover:text-[var(--ink-900)] transition-colors">
                  Task {renderSortIcon('title')}
                </button>
              </th>
              <th className="px-4 py-2.5 text-left eyebrow">Project</th>
              <th className="px-4 py-2.5 text-left eyebrow">Assignee</th>
              {(currentUser?.role === 'director' || currentUser?.role === 'teamLead') && (
                <th className="px-4 py-2.5 text-left eyebrow">Assigned By</th>
              )}
              <th className="px-4 py-2.5 text-left eyebrow">Priority</th>
              <th className="px-4 py-2.5 text-left">
                <button onClick={() => toggleSort('due_date')}
                  className="flex items-center gap-1 eyebrow hover:text-[var(--ink-900)] transition-colors">
                  Due Date {renderSortIcon('due_date')}
                </button>
              </th>
              <th className="px-4 py-2.5 text-left eyebrow">Status</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRow count={8} />
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={(currentUser?.role === 'director' || currentUser?.role === 'teamLead') ? 9 : 8} className="py-16 text-center text-[13px] text-[var(--ink-400)]">No tasks found</td>
              </tr>
            ) : sorted.map(task => {
              const taskOverdue = (task.is_overdue || isOverdue(task.due_date)) && task.status !== 'done'
              const memberNext = isMember ? getMemberNextStatus(task.status) : null

              return (
                <tr key={task.id}
                  className={`border-b border-[var(--line-1)] hover:bg-[var(--surface-2)]/60 transition-colors group ${taskOverdue ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}>
                  {canBulkAction && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(task.id)} onChange={() => toggleOne(task.id)} className="accent-[var(--primary)]" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusIcon status={task.status} />
                      {isMember ? (
                        <span className="text-[13px] font-medium text-[var(--ink-900)]">{task.title}</span>
                      ) : (
                        <button onClick={() => setEditTask(task)}
                          className="text-[13px] font-medium text-[var(--ink-900)] hover:text-[var(--primary)] transition-colors text-left">
                          {task.title}
                        </button>
                      )}
                      {task.has_active_revision && (
                        <span className="text-[10px] bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 rounded-full px-2 py-0.5 font-medium">
                          Revision #{task.revision_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {task.project_name && (
                      <span className="text-[11px] bg-[var(--surface-2)] text-[var(--ink-500)] ring-1 ring-inset ring-[var(--line-1)] rounded-[var(--r-xs)] px-2 py-0.5">
                        {task.project_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {task.assignee_id ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignee_name || '?'} size="xs" />
                          <span className="text-[13px] text-[var(--ink-500)]">{task.assignee_name}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-[var(--ink-400)]">—</span>
                      )}
                      {currentUser?.role === 'teamLead' && task.department && task.department !== currentUser.department && (
                        <span
                          className="text-[10px] bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 rounded-full px-1.5 py-0.5 font-medium w-fit"
                          title={`Assigned from ${task.department} department`}
                        >
                          {task.department}
                        </span>
                      )}
                    </div>
                  </td>
                  {(currentUser?.role === 'director' || currentUser?.role === 'teamLead') && (
                    <td className="px-4 py-3">
                      {task.creator ? (
                        task.creator.name === task.assignee_name ? (
                          <em className="text-[11px] text-[var(--ink-400)]">Self-assigned</em>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <Avatar name={task.creator.name} size="xs" />
                              <span className="text-[13px] text-[var(--ink-500)]">{task.creator.name}</span>
                            </div>
                            {currentUser?.role === 'teamLead' && task.creator.department && task.creator.department !== currentUser.department && (
                              <span className="text-[10px] bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 rounded-full px-1.5 py-0.5 font-medium w-fit">
                                {task.creator.department}
                              </span>
                            )}
                          </div>
                        )
                      ) : task.created_by_name ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.created_by_name} size="xs" />
                          <span className="text-[13px] text-[var(--ink-500)]">{task.created_by_name}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-[var(--ink-400)]">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-[13px] flex items-center gap-1 font-mono tabular-nums ${taskOverdue ? 'text-red-500 font-medium' : 'text-[var(--ink-500)]'}`}>
                      {taskOverdue && <AlertTriangle size={11} />}
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
                          className="text-[11px] border border-[var(--line-1)] rounded-[var(--r-xs)] px-2 py-1 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none focus:border-[var(--primary)]"
                        >
                          <option value={task.status} disabled>
                            {task.status === 'backlog' ? 'Backlog' : task.status === 'onHold' ? 'On Hold' : 'In Progress'}
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
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-[var(--r-sm)] hover:bg-amber-100 transition-colors whitespace-nowrap"
                        title="Raise Issue"
                      >
                        <AlertTriangle size={11} strokeWidth={1.8} /> Issue
                      </button>
                    ) : (
                      <button onClick={() => setEditTask(task)}
                        aria-label="Edit task"
                        className="opacity-0 group-hover:opacity-100 text-[var(--ink-400)] hover:text-[var(--ink-900)] transition-all">
                        <Pencil size={13} strokeWidth={1.8} />
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
