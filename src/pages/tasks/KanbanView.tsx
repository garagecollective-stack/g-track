import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import { Avatar } from '../../shared/Avatar'
import { PriorityBadge } from '../../shared/PriorityBadge'
import { EditTaskModal } from '../../modals/EditTaskModal'
import { AssignTaskModal } from '../../modals/AssignTaskModal'
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
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [addCol, setAddCol] = useState<TaskStatus | null>(null)
  const [activeTab, setActiveTab] = useState<TaskStatus>('backlog')

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const newStatus = result.destination.droppableId as TaskStatus
    const taskId = result.draggableId
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    await onStatusChange(taskId, newStatus)
  }

  function KanbanCard({ task, index }: { task: Task; index: number }) {
    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setEditTask(task)}
            className={`bg-white border rounded-lg p-3 shadow-sm cursor-pointer transition-all ${
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
                <span className={`text-xs ${isOverdue(task.due_date) && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}`}>
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
                    {currentUser?.role !== 'member' && (
                      <button onClick={() => setAddCol(col.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                        <Plus size={14} />
                      </button>
                    )}
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
      </div>

      <EditTaskModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
      <AssignTaskModal open={!!addCol} onClose={() => setAddCol(null)} projectId={projectId} />
    </>
  )
}
