import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Folder, CheckSquare, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../shared/Avatar'
import { StatusBadge } from '../shared/StatusBadge'
import { formatDateShort } from '../utils/helpers'

interface SearchResult {
  type: 'project' | 'task' | 'person'
  id: string
  title: string
  subtitle?: string
  meta?: string
  status?: string
}

let debounceTimer: ReturnType<typeof setTimeout>

interface Props {
  onClose: () => void
}

export function GlobalSearch({ onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ projects: SearchResult[]; tasks: SearchResult[]; people: SearchResult[] }>({ projects: [], tasks: [], people: [] })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults({ projects: [], tasks: [], people: [] }); return }
    setLoading(true)
    try {
      const [proj, task, people] = await Promise.all([
        supabase.from('projects').select('id, name, department, status').ilike('name', `%${q}%`).limit(5),
        supabase.from('tasks').select('id, title, assignee_name, due_date, status').ilike('title', `%${q}%`).limit(5),
        supabase.from('profiles').select('id, name, email, department, role').ilike('name', `%${q}%`).limit(5),
      ])
      setResults({
        projects: (proj.data || []).map(p => ({ type: 'project' as const, id: p.id, title: p.name, subtitle: p.department, status: p.status })),
        tasks: (task.data || []).map(t => ({ type: 'task' as const, id: t.id, title: t.title, subtitle: t.assignee_name || '', meta: t.due_date ? formatDateShort(t.due_date) : '', status: t.status })),
        people: (people.data || []).map(p => ({ type: 'person' as const, id: p.id, title: p.name, subtitle: `${p.department} · ${p.role}` })),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceTimer)
  }, [query, search])

  const allResults = [...results.projects, ...results.tasks, ...results.people]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && allResults[selected]) navigateTo(allResults[selected])
  }

  const navigateTo = (result: SearchResult) => {
    if (result.type === 'project') navigate(`/app/projects/${result.id}`)
    else if (result.type === 'task') navigate('/app/tasks')
    onClose()
  }

  const hasResults = allResults.length > 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-20 px-4">
      <div ref={ref} className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, people..."
            className="flex-1 py-4 text-sm text-gray-900 bg-transparent outline-none placeholder-gray-400"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
        </div>

        {query.length >= 2 && (
          <div className="max-h-[400px] overflow-y-auto">
            {loading && (
              <div className="space-y-2 p-4">
                {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded" />)}
              </div>
            )}

            {!loading && !hasResults && (
              <p className="py-10 text-center text-sm text-gray-400">No results for "{query}"</p>
            )}

            {!loading && hasResults && (
              <div>
                {results.projects.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Projects ({results.projects.length})</p>
                    {results.projects.map((r, i) => {
                      const idx = i
                      return (
                        <button key={r.id} onClick={() => navigateTo(r)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${selected === idx ? 'bg-[#edf8f4]' : ''}`}>
                          <Folder size={15} className="text-gray-400 shrink-0" />
                          <span className="text-sm font-medium text-gray-900 flex-1">{r.title}</span>
                          <span className="text-xs text-gray-400">{r.subtitle}</span>
                          {r.status && <StatusBadge status={r.status as any} />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {results.tasks.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tasks ({results.tasks.length})</p>
                    {results.tasks.map((r, i) => {
                      const idx = results.projects.length + i
                      return (
                        <button key={r.id} onClick={() => navigateTo(r)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${selected === idx ? 'bg-[#edf8f4]' : ''}`}>
                          <CheckSquare size={15} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-900 flex-1">{r.title}</span>
                          <span className="text-xs text-gray-400">{r.subtitle}{r.meta ? ` · ${r.meta}` : ''}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {results.people.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">People ({results.people.length})</p>
                    {results.people.map((r, i) => {
                      const idx = results.projects.length + results.tasks.length + i
                      return (
                        <button key={r.id} onClick={onClose}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${selected === idx ? 'bg-[#edf8f4]' : ''}`}>
                          <Avatar name={r.title} size="sm" />
                          <span className="text-sm text-gray-900 flex-1">{r.title}</span>
                          <span className="text-xs text-gray-400">{r.subtitle}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          <span>↑↓ navigate</span>
          <span>Enter open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  )
}
