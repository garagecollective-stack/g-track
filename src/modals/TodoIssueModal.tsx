import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import type { TodoItem } from '../types'

type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface Props {
  todo: TodoItem
  onClose: () => void
  onSuccess?: () => void
}

export function TodoIssueModal({ todo, onClose, onSuccess }: Props) {
  const { currentUser } = useApp()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !currentUser?.id) return
    setLoading(true)

    const { error } = await supabase.from('issues').insert({
      entity_type: 'task',
      entity_id: todo.id,
      entity_name: todo.title,
      raised_by: currentUser.id,
      raised_by_name: currentUser.name,
      department: currentUser.department || 'General',
      title: title.trim(),
      description: description.trim(),
      priority,
      source: 'todo',
      todo_id: todo.id,
      status: 'open',
    })

    setLoading(false)

    if (error) {
      toast.error('Failed to raise issue')
      return
    }

    toast.success('✅ Issue raised. Directors have been notified.')
    onSuccess?.()
    onClose()
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10 transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="text-base font-bold text-gray-900">Raise Issue</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Todo reference */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-400">Raising issue on todo:</p>
          <p className="text-sm font-medium text-gray-700 mt-0.5 truncate">{todo.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short summary of the issue"
              required
              autoFocus
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              required
              className={`${inputCls} resize-none`}
            />
          </div>

          <p className="text-xs text-gray-400">Directors will be notified of this issue.</p>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !title.trim() || !description.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:pointer-events-none">
              {loading ? 'Submitting…' : 'Raise Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
