import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Plus, AlertCircle, Check, Pause, Play, RotateCcw } from 'lucide-react'
import { Avatar } from '../../shared/Avatar'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { EditTaskModal } from '../../modals/EditTaskModal'
import { AssignTaskModal } from '../../modals/AssignTaskModal'
import { RaiseIssueModal } from '../../modals/RaiseIssueModal'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { formatDateShort, isOverdue } from '../../utils/helpers'
import type { Task, TaskStatus } from '../../types'
import { useApp } from '../../context/AppContext'

interface Props {
  tasks: Task[]
  projectId?: string
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>
}

const COLUMNS: { id: TaskStatus; label: string; dot: string }[] = [
  { id: 'backlog',    label: 'Backlog',     dot: 'bg-[var(--ink-400)]' },
  { id: 'inProgress', label: 'In Progress', dot: 'bg-[var(--primary)] animate-soft-pulse' },
  { id: 'onHold',     label: 'On Hold',     dot: 'bg-amber-500' },
  { id: 'done',       label: 'Done',        dot: 'bg-emerald-500' },
]

export function KanbanView({ tasks, projectId, onStatusChange }: Props) {
  const { currentUser } = useApp()
  const isMember = currentUser?.role === 'member'
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [addCol, setAddCol] = useState<TaskStatus | null>(null)
  const [activeTab, setActiveTab] = useState<TaskStatus>('backlog')
  const [issueTask, setIssueTask] = useState<Task | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ task: Task; newStatus: TaskStatus } | null>(null)

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const newStatus = result.destination.droppableId as TaskStatus
    const taskId = result.draggableId
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    await onStatusChange(taskId, newStatus)
  }

  const handleMemberStatusAction = (task: Task, newStatus: TaskStatus) => {
    setConfirmAction({ task, newStatus })
  }

  const confirmStatusChange = async () => {
    if (!confirmAction) return
    await onStatusChange(confirmAction.task.id, confirmAction.newStatus)
    setConfirmAction(null)
  }

  function MemberKanbanCard({ task }: { task: Task }) {
    const taskOverdue = (task.is_overdue || isOverdue(task.due_date)) && task.status !== 'done'
    return (
      <div className={`bg-[var(--surface-1)] border rounded-[var(--r-md)] p-3 shadow-[var(--shadow-xs)] transition-all relative ${
        taskOverdue ? 'border-red-300 ring-1 ring-inset ring-red-100 dark:ring-red-900/40' : 'border-[var(--line-1)]'
      }`}>
        <div className="flex items-start justify-between mb-1.5">
          <PriorityBadge priority={task.priority} />
          <button
            onClick={() => setIssueTask(task)}
            className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-[var(--r-xs)] transition-colors"
            title="Raise Issue"
            aria-label="Raise issue"
          >
            <AlertCircle size={13} strokeWidth={1.8} />
          </button>
        </div>
        <p className="text-[13px] font-medium text-[var(--ink-900)] mb-1 leading-[1.35]">{task.title}</p>
        {task.project_name && (
          <p className="text-[11px] text-[var(--ink-400)] mb-2 truncate">{task.project_name}</p>
        )}
        <div className="flex items-center justify-between">
          {task.assignee_id ? (
            <Avatar name={task.assignee_name || '?'} size="xs" />
          ) : <div />}
          {task.due_date && (
            <span className={`text-[11px] font-mono tabular-nums ${taskOverdue ? 'text-red-500 font-medium' : 'text-[var(--ink-400)]'}`}>
              {formatDateShort(task.due_date)}
            </span>
          )}
        </div>
        {task.status === 'backlog' && (
          <button
            onClick={() => handleMemberStatusAction(task, 'inProgress')}
            className="mt-2 w-full inline-flex items-center justify-center gap-1 text-[11px] py-1.5 bg-[var(--primary)] text-white font-medium rounded-[var(--r-sm)] hover:bg-[var(--primary-hi)] transition-colors shadow-[var(--shadow-xs)]"
          >
            <Play size={11} strokeWidth={2} /> Start
          </button>
        )}
        {task.status === 'inProgress' && (
          <div className="mt-2 flex gap-1">
            <button
              onClick={() => handleMemberStatusAction(task, 'done')}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] py-1.5 bg-emerald-500 text-white font-medium rounded-[var(--r-sm)] hover:bg-emerald-600 transition-colors shadow-[var(--shadow-xs)]"
            >
              <Check size={11} strokeWidth={2.4} /> Done
            </button>
            <button
              onClick={() => handleMemberStatusAction(task, 'onHold')}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] py-1.5 bg-amber-50 text-amber-700 font-medium rounded-[var(--r-sm)] hover:bg-amber-100 border border-amber-200 transition-colors"
              title="Put on hold"
            >
              <Pause size={11} strokeWidth={2} /> Hold
            </button>
          </div>
        )}
        {task.status === 'onHold' && (
          <button
            onClick={() => handleMemberStatusAction(task, 'inProgress')}
            className="mt-2 w-full inline-flex items-center justify-center gap-1 text-[11px] py-1.5 bg-[var(--surface-3)] text-[var(--ink-900)] font-medium rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] border border-[var(--line-1)] transition-colors"
          >
            <Play size={11} strokeWidth={2} /> Resume
          </button>
        )}
        {task.status === 'done' && (
          <p className="mt-2 text-[11px] text-center text-emerald-600 font-medium inline-flex items-center justify-center gap-1 w-full">
            <Check size={11} strokeWidth={2.4} /> Completed
          </p>
        )}
      </div>
    )
  }

  function KanbanCard({ task, index }: { task: Task; index: number }) {
    const taskOverdue = (task.is_overdue || isOverdue(task.due_date)) && task.status !== 'done'
    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setEditTask(task)}
            className={`bg-[var(--surface-1)] border rounded-[var(--r-md)] p-3 shadow-[var(--shadow-xs)] cursor-pointer transition-all ${
              taskOverdue ? 'border-red-300' : ''
            } ${
              snapshot.isDragging
                ? 'shadow-[var(--shadow-lg)] border-[var(--primary)] ring-2 ring-[var(--primary)]/15 rotate-1 scale-[1.01]'
                : 'border-[var(--line-1)] hover:border-[var(--primary-200)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5'
            }`}
          >
            <PriorityBadge priority={task.priority} />
            <p className="text-[13px] font-medium text-[var(--ink-900)] mt-2 mb-1 leading-[1.35]">{task.title}</p>
            {task.project_name && (
              <p className="text-[11px] text-[var(--ink-400)] mb-2 truncate">{task.project_name}</p>
            )}
            <div className="flex items-center justify-between">
              {(task.assignees && task.assignees.length > 0) ? (
                <div className="flex -space-x-2">
                  {task.assignees.slice(0, 3).map(a => (
                    <div key={a.id}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] ring-2 ring-[var(--surface-1)] flex items-center justify-center text-white text-[10px] font-semibold"
                      title={a.name}
                    >
                      {a.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  ))}
                  {(task.assignees.length || 0) > 3 && (
                    <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] ring-2 ring-[var(--surface-1)] flex items-center justify-center text-[var(--ink-500)] text-[10px] font-semibold">
                      +{(task.assignees.length || 0) - 3}
                    </div>
                  )}
                </div>
              ) : task.assignee_id ? (
                <Avatar name={task.assignee_name || '?'} size="xs" />
              ) : <div />}
              {task.due_date && (
                <span className={`text-[11px] font-mono tabular-nums ${taskOverdue ? 'text-red-500 font-medium' : 'text-[var(--ink-400)]'}`}>
                  {formatDateShort(task.due_date)}
                </span>
              )}
            </div>
            {task.has_active_revision && (
              <div className="mt-2">
                <span className="text-[10px] bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 rounded-full px-2 py-0.5 font-medium inline-flex items-center gap-1">
                  <RotateCcw size={9} strokeWidth={2.2} /> Revision #{task.revision_count}
                </span>
              </div>
            )}
          </div>
        )}
      </Draggable>
    )
  }

  const renderMobileView = () => (
    <div>
      <div className="relative mb-4">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {COLUMNS.map(col => {
          const count = byStatus(col.id).length
          return (
            <button key={col.id} onClick={() => setActiveTab(col.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
                activeTab === col.id
                  ? 'bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]'
                  : 'bg-[var(--surface-2)] text-[var(--ink-700)] border border-[var(--line-1)]'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activeTab === col.id ? 'bg-white/70' : col.dot}`} />
              {col.label}
              <span className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === col.id ? 'bg-white/20' : 'bg-[var(--surface-3)]'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--canvas)] to-transparent pointer-events-none" />
      </div>
      <div className="space-y-2">
        {byStatus(activeTab).map(task => (
          isMember ? (
            <MemberKanbanCard key={task.id} task={task} />
          ) : (
            <div key={task.id} onClick={() => setEditTask(task)}
              className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-md)] p-3 shadow-[var(--shadow-xs)]">
              <PriorityBadge priority={task.priority} />
              <p className="text-[13px] font-medium text-[var(--ink-900)] mt-2">{task.title}</p>
              {task.project_name && <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{task.project_name}</p>}
              <div className="flex items-center justify-between mt-2">
                {task.assignee_id ? <Avatar name={task.assignee_name || '?'} size="xs" /> : <div />}
                {task.due_date && <span className="text-[11px] text-[var(--ink-400)] font-mono tabular-nums">{formatDateShort(task.due_date)}</span>}
              </div>
            </div>
          )
        ))}
        {byStatus(activeTab).length === 0 && (
          <p className="text-center text-[13px] text-[var(--ink-400)] py-8">No tasks</p>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="md:hidden">
        {renderMobileView()}
      </div>

      <div className="hidden md:block">
        {isMember ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {COLUMNS.map(col => {
              const colTasks = byStatus(col.id)
              return (
                <div key={col.id} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-[13px] font-semibold text-[var(--ink-700)] tracking-[-0.005em]">{col.label}</span>
                    <span className="font-mono tabular-nums bg-[var(--surface-2)] text-[var(--ink-500)] text-[11px] font-medium rounded-[var(--r-xs)] px-1.5 py-0.5 border border-[var(--line-1)]">{colTasks.length}</span>
                  </div>
                  <div className="flex-1 min-h-[200px] rounded-[var(--r-lg)] bg-[var(--surface-2)]/60 border border-[var(--line-1)] p-3 space-y-2">
                    {colTasks.map(task => <MemberKanbanCard key={task.id} task={task} />)}
                    {colTasks.length === 0 && (
                      <p className="text-[11px] text-[var(--ink-400)] text-center py-4">No tasks</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-3 gap-4">
              {COLUMNS.map(col => {
                const colTasks = byStatus(col.id)
                return (
                  <div key={col.id} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className="text-[13px] font-semibold text-[var(--ink-700)] tracking-[-0.005em]">{col.label}</span>
                        <span className="font-mono tabular-nums bg-[var(--surface-2)] text-[var(--ink-500)] text-[11px] font-medium rounded-[var(--r-xs)] px-1.5 py-0.5 border border-[var(--line-1)]">{colTasks.length}</span>
                      </div>
                      <button onClick={() => setAddCol(col.id)}
                        className="p-1 text-[var(--ink-400)] hover:text-[var(--ink-900)] hover:bg-[var(--surface-2)] rounded-[var(--r-xs)] transition-colors"
                        aria-label="Add task">
                        <Plus size={13} strokeWidth={1.8} />
                      </button>
                    </div>
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 min-h-[200px] rounded-[var(--r-lg)] p-3 space-y-2 transition-colors border ${
                            snapshot.isDraggingOver
                              ? 'bg-[var(--primary-50)] border-[var(--primary-200)]'
                              : 'bg-[var(--surface-2)]/60 border-[var(--line-1)]'
                          }`}
                        >
                          {colTasks.map((task, index) => <KanbanCard key={task.id} task={task} index={index} />)}
                          {provided.placeholder}
                          {colTasks.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-[11px] text-[var(--ink-400)] text-center py-4">Drop tasks here</p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {!isMember && (
        <>
          <EditTaskModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
          <AssignTaskModal open={!!addCol} onClose={() => setAddCol(null)} projectId={projectId} />
        </>
      )}

      {issueTask && (
        <RaiseIssueModal
          open={!!issueTask}
          onClose={() => setIssueTask(null)}
          presetEntity={{ type: 'task', id: issueTask.id, name: issueTask.title }}
        />
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmStatusChange}
        title={`Mark as ${confirmAction?.newStatus === 'inProgress' ? 'In Progress' : confirmAction?.newStatus === 'onHold' ? 'On Hold' : 'Done'}?`}
        description={`Mark "${confirmAction?.task.title}" as ${confirmAction?.newStatus === 'inProgress' ? 'In Progress' : confirmAction?.newStatus === 'onHold' ? 'On Hold' : 'Done'}?`}
        confirmLabel="Confirm"
        variant="confirm"
      />
    </>
  )
}
