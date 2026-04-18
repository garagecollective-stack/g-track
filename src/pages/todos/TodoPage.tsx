import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, CheckCircle2, Circle, Pencil, Trash2, Calendar, CheckSquare, ListTodo, Clock, ChevronDown, ChevronUp, Link2, AlertTriangle } from 'lucide-react'
import { useTodos } from '../../hooks/useTodos'
import { useProjects } from '../../hooks/useProjects'
import { useToast } from '../../hooks/useToast'
import { useApp } from '../../context/AppContext'
import { friendlyError, formatDateShort, isOverdue } from '../../utils/helpers'
import { TodoIssueModal } from '../../modals/TodoIssueModal'
import type { TodoItem } from '../../types'

type Filter = 'all' | 'pending' | 'completed'

function TodoForm({
  initial,
  onSave,
  onCancel,
  projects,
}: {
  initial?: Partial<TodoItem>
  onSave: (v: { title: string; description: string; due_date: string; notes: string; project_id: string; project_name: string }) => Promise<void>
  onCancel: () => void
  projects: { id: string; name: string }[]
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [projectId, setProjectId] = useState(initial?.project_id ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const selectedProject = projects.find(p => p.id === projectId)
    try {
      await onSave({
        title: title.trim(),
        description,
        due_date: dueDate,
        notes: notes.trim(),
        project_id: projectId,
        project_name: selectedProject?.name ?? '',
      })
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2 text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all'

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--surface-1)] border border-[var(--primary)]/30 rounded-[var(--r-lg)] p-4 shadow-sm space-y-3">
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
          <label className="text-xs text-[var(--ink-500)] mb-1 block">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
        {projects.length > 0 && (
          <div className="flex-1">
            <label className="text-xs text-[var(--ink-500)] mb-1 block">Link to project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputClass}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-[var(--ink-500)] mb-1 block">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Private notes for this task…"
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving || !title.trim()}
          className="px-4 py-1.5 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-50">
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
  onRaiseIssue,
  showRaiseIssue,
}: {
  todo: TodoItem
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onRaiseIssue?: () => void
  showRaiseIssue?: boolean
}) {
  const done = todo.status === 'completed'
  const overdue = !done && isOverdue(todo.due_date)
  const [showNotes, setShowNotes] = useState(false)

  return (
    <div className={`bg-[var(--surface-1)] border rounded-[var(--r-lg)] p-4 transition-all group ${
      done ? 'border-[var(--line-1)] opacity-70' : overdue ? 'border-red-200' : 'border-[var(--line-1)] hover:border-[var(--primary)]/30 hover:shadow-sm'
    }`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0 text-[var(--ink-400)] hover:text-[var(--primary)] transition-colors">
          {done
            ? <CheckCircle2 size={20} className="text-[var(--primary)]" />
            : <Circle size={20} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${done ? 'line-through text-[var(--ink-400)]' : 'text-[var(--ink-900)]'}`}>
            {todo.title}
          </p>
          {todo.description && (
            <p className={`text-xs mt-0.5 ${done ? 'text-[var(--ink-400)]' : 'text-[var(--ink-500)]'}`}>
              {todo.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            {todo.due_date && (
              <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500 font-medium' : done ? 'text-[var(--ink-400)]' : 'text-[var(--ink-400)]'}`}>
                <Calendar size={11} />
                {overdue ? 'Overdue · ' : 'Due '}{formatDateShort(todo.due_date)}
              </div>
            )}
            {todo.project_name && (
              <div className="flex items-center gap-1 text-xs text-[var(--primary)]">
                <Link2 size={11} />
                {todo.project_name}
              </div>
            )}
          </div>
          {todo.notes && (
            <div className="mt-2">
              <button
                onClick={() => setShowNotes(v => !v)}
                className="flex items-center gap-1 text-[10px] text-[var(--ink-400)] hover:text-[var(--ink-700)] transition-colors"
              >
                {showNotes ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showNotes ? 'Hide notes' : 'Show notes'}
              </button>
              {showNotes && (
                <p className="mt-1 text-xs text-[var(--ink-500)] bg-[var(--surface-2)] rounded-[var(--r-sm)] px-2.5 py-2 whitespace-pre-wrap">
                  {todo.notes}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {showRaiseIssue && !todo.has_issue && (
            <button onClick={onRaiseIssue}
              className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-[var(--r-sm)] transition-colors"
              title="Raise Issue">
              <AlertTriangle size={13} />
            </button>
          )}
          <button onClick={onEdit}
            className="p-1 text-[var(--ink-400)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-[var(--r-sm)] transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1 text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 rounded-[var(--r-sm)] transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function TodoPage() {
  const toast = useToast()
  const { currentUser } = useApp()
  const { todos, loading, createTodo, updateTodo, toggleTodo, deleteTodo, pending, completed } = useTodos()
  const { projects } = useProjects()
  const [filter, setFilter] = useState<Filter>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [raisingIssueFor, setRaisingIssueFor] = useState<TodoItem | null>(null)

  const isTeamLead = currentUser?.role === 'teamLead'

  const filtered = todos.filter(t => {
    if (filter === 'pending') return t.status === 'pending'
    if (filter === 'completed') return t.status === 'completed'
    return true
  })

  async function handleCreate(values: { title: string; description: string; due_date: string; notes: string; project_id: string; project_name: string }) {
    try {
      await createTodo({
        title: values.title,
        description: values.description || undefined,
        due_date: values.due_date || undefined,
        notes: values.notes || undefined,
        project_id: values.project_id || undefined,
        project_name: values.project_name || undefined,
      })
      setShowAdd(false)
      toast.success('Task added')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  async function handleUpdate(id: string, values: { title: string; description: string; due_date: string; notes: string; project_id: string; project_name: string }) {
    try {
      await updateTodo(id, {
        title: values.title,
        description: values.description || undefined,
        due_date: values.due_date || undefined,
        notes: values.notes || undefined,
        project_id: values.project_id || null,
        project_name: values.project_name || null,
      })
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
    <div className="px-4 py-4 md:px-6 md:py-5 xl:py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink-900)]" style={{ letterSpacing: '-0.5px' }}>My To-Do List</h1>
          <p className="text-sm text-[var(--ink-500)] mt-0.5">Personal tasks, visible only to you</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null) }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors"
        >
          <Plus size={15} /> Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total',     value: todos.length,  icon: ListTodo,      color: 'text-[var(--ink-700)]', bg: 'bg-[var(--surface-2)]'    },
          { label: 'Pending',   value: pending,       icon: Clock,         color: 'text-blue-600', bg: 'bg-blue-50'    },
          { label: 'Completed', value: completed,     icon: CheckSquare,   color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-50)]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-[var(--r-lg)] p-3 md:p-4 border border-[var(--line-1)]`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={14} className={color} />
              <span className="text-xs text-[var(--ink-500)]">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`} style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && !editingId && (
        <div className="mb-4">
          <TodoForm
            projects={projects}
            onSave={handleCreate}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-[var(--surface-2)] rounded-[var(--r-sm)] w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-[var(--r-xs)] transition-colors flex items-center gap-1.5 ${
              filter === f.key ? 'bg-[var(--surface-1)] text-[var(--ink-900)] shadow-sm' : 'text-[var(--ink-500)] hover:text-[var(--ink-700)]'
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              filter === f.key ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-gray-200 text-[var(--ink-500)]'
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-[var(--surface-2)] rounded-[var(--r-lg)] skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 size={40} className="mx-auto text-[var(--ink-400)] mb-3" />
          <p className="text-sm font-medium text-[var(--ink-500)]">
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
                projects={projects}
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
                showRaiseIssue={isTeamLead}
                onRaiseIssue={() => setRaisingIssueFor(todo)}
              />
            )
          ))}
        </div>
      )}

      {raisingIssueFor && (
        <TodoIssueModal
          todo={raisingIssueFor}
          onClose={() => setRaisingIssueFor(null)}
          onSuccess={() => setRaisingIssueFor(null)}
        />
      )}
    </div>
  )
}
