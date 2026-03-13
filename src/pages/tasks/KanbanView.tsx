import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Plus, AlertCircle } from 'lucide-react'
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

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'text-gray-600' },
  { id: 'inProgress', label: 'In Progress', color: 'text-blue-600' },
  { id: 'done', label: 'Done', color: 'text-green-600' },
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
      <div className={`bg-white border rounded-lg p-3 shadow-sm transition-all relative ${
        taskOverdue ? 'border-l-2 border-red-500' : 'border-gray-200'
      }`}>
        <div className="flex items-start justify-between mb-1">
          <PriorityBadge priority={task.priority} />
          <button
            onClick={() => setIssueTask(task)}
            className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
            title="Raise Issue"
          >
            <AlertCircle size={14} />
          </button>
        </div>
        <p className="text-sm font-medium text-gray-900 mt-1 mb-1">{task.title}</p>
        {task.project_name && (
          <p className="text-xs text-gray-400 mb-2">{task.project_name}</p>
        )}
        <div className="flex items-center justify-between">
          {task.assignee_id ? (
            <Avatar name={task.assignee_name || '?'} size="xs" />
          ) : <div />}
          {task.due_date && (
            <span className={`text-xs ${taskOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {formatDateShort(task.due_date)}
            </span>
          )}
        </div>
        {/* Status action button */}
        {task.status === 'backlog' && (
          <button
            onClick={() => handleMemberStatusAction(task, 'inProgress')}
            className="mt-2 w-full text-xs py-1 bg-[#0A5540] text-white font-medium rounded-lg hover:bg-[#0d6b51] transition-colors"
          >
            → Start
          </button>
        )}
        {task.status === 'inProgress' && (
          <button
            onClick={() => handleMemberStatusAction(task, 'done')}
            className="mt-2 w-full text-xs py-1 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
          >
            ✓ Done
          </button>
        )}
        {task.status === 'done' && (
          <p className="mt-2 text-xs text-center text-green-600 font-medium">✓ Completed</p>
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
            className={`bg-white border rounded-lg p-3 shadow-sm cursor-pointer transition-all ${
              taskOverdue ? 'border-l-2 border-red-500' : ''
            } ${
              snapshot.isDragging
                ? 'shadow-lg border-[#0A5540] rotate-1'
                : 'border-gray-200 hover:border-[#0A5540]/40'
            }`}
          >
            <PriorityBadge priority={task.priority} />
            <p className="text-sm font-medium text-gray-900 mt-2 mb-1">{task.title}</p>
            {task.project_name && (
              <p className="text-xs text-gray-400 mb-2">{task.project_name}</p>
            )}
            <div className="flex items-center justify-between">
              {task.assignee_id ? (
                <Avatar name={task.assignee_name || '?'} size="xs" />
              ) : <div />}
              {task.due_date && (
                <span className={`text-xs ${taskOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {formatDateShort(task.due_date)}
                </span>
              )}
            </div>
          </div>
        )}
      </Draggable>
    )
  }

  // Mobile: single tab view
  const MobileView = () => (
    <div>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {COLUMNS.map(col => {
          const count = byStatus(col.id).length
          return (
            <button key={col.id} onClick={() => setActiveTab(col.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === col.id
                  ? 'bg-[#0A5540] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
              {col.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === col.id ? 'bg-white/20' : 'bg-gray-200'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>
      <div className="space-y-2">
        {byStatus(activeTab).map(task => (
          isMember ? (
            <MemberKanbanCard key={task.id} task={task} />
          ) : (
            <div key={task.id} onClick={() => setEditTask(task)}
              className="bg-white border border-gray-200 rounded-lg p-3">
              <PriorityBadge priority={task.priority} />
              <p className="text-sm font-medium text-gray-900 mt-2">{task.title}</p>
              {task.project_name && <p className="text-xs text-gray-400 mt-0.5">{task.project_name}</p>}
              <div className="flex items-center justify-between mt-2">
                {task.assignee_id ? <Avatar name={task.assignee_name || '?'} size="xs" /> : <div />}
                {task.due_date && <span className="text-xs text-gray-400">{formatDateShort(task.due_date)}</span>}
              </div>
            </div>
          )
        ))}
        {byStatus(activeTab).length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No tasks</p>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden">
        <MobileView />
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        {isMember ? (
          // Member: no drag-drop, action buttons instead
          <div className="grid grid-cols-3 gap-4">
            {COLUMNS.map(col => {
              const colTasks = byStatus(col.id)
              return (
                <div key={col.id} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold rounded-md px-2 py-0.5">{colTasks.length}</span>
                  </div>
                  <div className="flex-1 min-h-[200px] rounded-xl bg-gray-50 p-3 space-y-2">
                    {colTasks.map(task => <MemberKanbanCard key={task.id} task={task} />)}
                    {colTasks.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Non-member: full drag-drop
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-3 gap-4">
              {COLUMNS.map(col => {
                const colTasks = byStatus(col.id)
                return (
                  <div key={col.id} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                        <span className="bg-gray-100 text-gray-600 text-xs font-semibold rounded-md px-2 py-0.5">{colTasks.length}</span>
                      </div>
                      <button onClick={() => setAddCol(col.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 min-h-[200px] rounded-xl p-3 space-y-2 transition-colors ${
                            snapshot.isDraggingOver
                              ? 'bg-[#edf8f4]'
                              : 'bg-gray-50'
                          }`}
                        >
                          {colTasks.map((task, index) => <KanbanCard key={task.id} task={task} index={index} />)}
                          {provided.placeholder}
                          {colTasks.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-xs text-gray-400 text-center py-4">Drop tasks here</p>
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
        title={`Mark as ${confirmAction?.newStatus === 'inProgress' ? 'In Progress' : 'Done'}?`}
        description={`Mark "${confirmAction?.task.title}" as ${confirmAction?.newStatus === 'inProgress' ? 'In Progress' : 'Done'}?`}
        confirmLabel="Confirm"
        variant="warning"
      />
    </>
  )
}
