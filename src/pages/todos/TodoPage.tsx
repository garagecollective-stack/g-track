import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, CheckCircle2, Circle, Pencil, Trash2, Calendar, CheckSquare, ListTodo, Clock } from 'lucide-react'
import { useTodos } from '../../hooks/useTodos'
import { useToast } from '../../hooks/useToast'
import { friendlyError, formatDateShort, isOverdue } from '../../utils/helpers'
import type { TodoItem } from '../../types'

type Filter = 'all' | 'pending' | 'completed'

function TodoForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<TodoItem>
  onSave: (v: { title: string; description: string; due_date: string }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), description, due_date: dueDate })
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10 transition-all'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[#0A5540]/30 rounded-xl p-4 shadow-sm space-y-3">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title *"
        required
        className={inputClass}
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className={`${inputClass} resize-none`}
      />
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving || !title.trim()}
          className="px-4 py-1.5 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}

function TodoCard({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: {
  todo: TodoItem
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const done = todo.status === 'completed'
  const overdue = !done && isOverdue(todo.due_date)

  return (
    <div className={`bg-white border rounded-xl p-4 transition-all group ${
      done ? 'border-gray-100 opacity-70' : overdue ? 'border-red-200' : 'border-gray-100 hover:border-[#0A5540]/30 hover:shadow-sm'
    }`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0 text-gray-400 hover:text-[#0A5540] transition-colors">
          {done
            ? <CheckCircle2 size={20} className="text-[#0A5540]" />
            : <Circle size={20} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {todo.title}
          </p>
          {todo.description && (
            <p className={`text-xs mt-0.5 ${done ? 'text-gray-300' : 'text-gray-500'}`}>
              {todo.description}
            </p>
          )}
          {todo.due_date && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs ${overdue ? 'text-red-500 font-medium' : done ? 'text-gray-300' : 'text-gray-400'}`}>
              <Calendar size={11} />
              {overdue ? 'Overdue · ' : 'Due '}{formatDateShort(todo.due_date)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit}
            className="p-1 text-gray-400 hover:text-[#0A5540] hover:bg-[#0A5540]/5 rounded-lg transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function TodoPage() {
  const toast = useToast()
  const { todos, loading, createTodo, updateTodo, toggleTodo, deleteTodo, pending, completed } = useTodos()
  const [filter, setFilter] = useState<Filter>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const filtered = todos.filter(t => {
    if (filter === 'pending') return t.status === 'pending'
    if (filter === 'completed') return t.status === 'completed'
    return true
  })

  async function handleCreate(values: { title: string; description: string; due_date: string }) {
    try {
      await createTodo(values)
      setShowAdd(false)
      toast.success('Task added')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  async function handleUpdate(id: string, values: { title: string; description: string; due_date: string }) {
    try {
      await updateTodo(id, { title: values.title, description: values.description, due_date: values.due_date || undefined })
      setEditingId(null)
      toast.success('Task updated')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTodo(id)
      toast.success('Task deleted')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  async function handleToggle(todo: TodoItem) {
    try {
      await toggleTodo(todo.id, todo.status)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: 'all',       label: 'All',       count: todos.length },
    { key: 'pending',   label: 'Pending',   count: pending },
    { key: 'completed', label: 'Completed', count: completed },
  ]

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.5px' }}>My To-Do List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Personal tasks, visible only to you</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null) }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors"
        >
          <Plus size={15} /> Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total',     value: todos.length,  icon: ListTodo,      color: 'text-gray-700', bg: 'bg-gray-50'    },
          { label: 'Pending',   value: pending,       icon: Clock,         color: 'text-blue-600', bg: 'bg-blue-50'    },
          { label: 'Completed', value: completed,     icon: CheckSquare,   color: 'text-[#0A5540]', bg: 'bg-[#edf8f4]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3 md:p-4 border border-gray-100`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={14} className={color} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`} style={{ fontFamily: 'DM Mono, monospace' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && !editingId && (
        <div className="mb-4">
          <TodoForm
            onSave={handleCreate}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              filter === f.key ? 'bg-[#0A5540]/10 text-[#0A5540]' : 'bg-gray-200 text-gray-500'
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {filter === 'completed' ? 'No completed tasks yet' : filter === 'pending' ? 'No pending tasks' : 'No tasks yet — add one above'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(todo => (
            editingId === todo.id ? (
              <TodoForm
                key={todo.id}
                initial={todo}
                onSave={v => handleUpdate(todo.id, v)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={() => handleToggle(todo)}
                onEdit={() => { setEditingId(todo.id); setShowAdd(false) }}
                onDelete={() => handleDelete(todo.id)}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}
