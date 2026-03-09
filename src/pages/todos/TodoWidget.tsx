import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Circle, ArrowRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTodos } from '../../hooks/useTodos'
import { useToast } from '../../hooks/useToast'
import { friendlyError, isOverdue, formatDateShort } from '../../utils/helpers'
import type { TodoItem } from '../../types'

export function TodoWidget() {
  const toast = useToast()
  const { todos, loading, createTodo, toggleTodo, deleteTodo } = useTodos()
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const pending = todos.filter(t => t.status === 'pending').slice(0, 5)

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      await createTodo({ title: newTitle.trim() })
      setNewTitle('')
      toast.success('Task added')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(todo: TodoItem) {
    try { await toggleTodo(todo.id, todo.status) }
    catch (err) { toast.error(friendlyError(err)) }
  }

  async function handleDelete(id: string) {
    try { await deleteTodo(id) }
    catch (err) { toast.error(friendlyError(err)) }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">My To-Do</h3>
        <Link to="/app/todos" className="flex items-center gap-1 text-xs text-[#0A5540] hover:underline">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50">
        <Plus size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
        />
        {newTitle.trim() && (
          <button type="submit" disabled={adding}
            className="text-xs text-[#0A5540] font-medium hover:underline shrink-0">
            Add
          </button>
        )}
      </form>

      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-3 space-y-2">
            {[1,2].map(i => <div key={i} className="h-4 bg-gray-100 rounded skeleton" />)}
          </div>
        ) : pending.length === 0 ? (
          <p className="px-4 py-4 text-xs text-gray-400 text-center">All caught up!</p>
        ) : (
          pending.map(todo => {
            const overdue = isOverdue(todo.due_date)
            return (
              <div key={todo.id} className="flex items-center gap-2.5 px-3 py-2.5 group hover:bg-gray-50 transition-colors">
                <button onClick={() => handleToggle(todo)} className="text-gray-300 hover:text-[#0A5540] transition-colors shrink-0">
                  <Circle size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{todo.title}</p>
                  {todo.due_date && (
                    <p className={`text-[10px] ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                      {overdue ? 'Overdue · ' : ''}{formatDateShort(todo.due_date)}
                    </p>
                  )}
                </div>
                <button onClick={() => handleDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all shrink-0">
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {todos.filter(t => t.status === 'pending').length > 5 && (
        <div className="px-4 py-2 border-t border-gray-50">
          <Link to="/app/todos" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            +{todos.filter(t => t.status === 'pending').length - 5} more pending
          </Link>
        </div>
      )}
    </div>
  )
}
