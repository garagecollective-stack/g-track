import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, ClipboardList, AlertTriangle, CalendarClock, ArrowUpRight, User as UserIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'

type UnfurlKind = 'project' | 'task' | 'issue'

interface ParsedLink {
  kind: UnfurlKind
  id: string
  url: string
}

interface ProjectUnfurl {
  id: string
  name: string
  key: string
  status: string
  priority: string
  due_date: string | null
  department: string | null
}

interface TaskUnfurl {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  assignee_name: string | null
  project_name: string | null
}

interface IssueUnfurl {
  id: string
  title: string
  status: string
  priority: string
  entity_name: string
  raised_by_name: string
}

type UnfurlData = ProjectUnfurl | TaskUnfurl | IssueUnfurl

// Match both absolute and relative G-Track URLs
// /app/projects/:uuid
// /app/tasks?highlight=:uuid  OR  /app/tasks?task=:uuid
// /app/issues?open=:uuid
const URL_RE = /(?:https?:\/\/[^\s<>"]+)?\/app\/(projects\/([0-9a-f-]{36})|tasks\?(?:highlight|task)=([0-9a-f-]{36})|issues\?open=([0-9a-f-]{36}))/gi

export function parseUnfurlLinks(text: string): ParsedLink[] {
  const found: ParsedLink[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(URL_RE.source, 'gi')
  while ((match = re.exec(text)) !== null) {
    const [full, , projectId, taskId, issueId] = match
    if (projectId && !seen.has(projectId)) {
      seen.add(projectId)
      found.push({ kind: 'project', id: projectId, url: full })
    } else if (taskId && !seen.has(taskId)) {
      seen.add(taskId)
      found.push({ kind: 'task', id: taskId, url: full })
    } else if (issueId && !seen.has(issueId)) {
      seen.add(issueId)
      found.push({ kind: 'issue', id: issueId, url: full })
    }
    if (found.length >= 3) break
  }
  return found
}

// ── Lightweight in-memory cache to avoid refetching across renders ────────────

const cache = new Map<string, UnfurlData | null>()

async function fetchUnfurl(link: ParsedLink): Promise<UnfurlData | null> {
  const cacheKey = `${link.kind}:${link.id}`
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null

  let data: UnfurlData | null = null

  if (link.kind === 'project') {
    const { data: row } = await supabase
      .from('projects')
      .select('id, name, key, status, priority, due_date, department')
      .eq('id', link.id)
      .maybeSingle()
    data = row as ProjectUnfurl | null
  } else if (link.kind === 'task') {
    const { data: row } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, assignee_name, project_name')
      .eq('id', link.id)
      .maybeSingle()
    data = row as TaskUnfurl | null
  } else if (link.kind === 'issue') {
    const { data: row } = await supabase
      .from('issues')
      .select('id, title, status, priority, entity_name, raised_by_name')
      .eq('id', link.id)
      .maybeSingle()
    data = row as IssueUnfurl | null
  }

  cache.set(cacheKey, data)
  return data
}

// ── Visual helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog',
  inProgress: 'In progress',
  onHold: 'On hold',
  done: 'Done',
  completed: 'Completed',
  open: 'Open',
  in_review: 'In review',
  resolved: 'Resolved',
  closed: 'Closed',
}

const STATUS_TONE: Record<string, string> = {
  backlog:    'bg-[var(--surface-2)] text-[var(--ink-700)] ring-[var(--line-2)]',
  inProgress: 'bg-amber-50 text-amber-700 ring-amber-200',
  onHold:     'bg-orange-50 text-orange-700 ring-orange-200',
  done:       'bg-emerald-50 text-emerald-700 ring-emerald-200',
  completed:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  open:       'bg-blue-50 text-blue-700 ring-blue-200',
  in_review:  'bg-amber-50 text-amber-700 ring-amber-200',
  resolved:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed:     'bg-[var(--surface-2)] text-[var(--ink-500)] ring-[var(--line-2)]',
}

const PRIORITY_TONE: Record<string, string> = {
  critical: 'text-red-600',
  urgent:   'text-red-600',
  high:     'text-orange-600',
  medium:   'text-amber-600',
  low:      'text-[var(--ink-500)]',
}

function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status
  const tone = STATUS_TONE[status] ?? 'bg-[var(--surface-2)] text-[var(--ink-500)] ring-[var(--line-2)]'
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--r-xs)] text-[10px] font-semibold ring-1 ring-inset ${tone}`}>
      {label}
    </span>
  )
}

// ── UnfurlCard ────────────────────────────────────────────────────────────────

function UnfurlCard({ link }: { link: ParsedLink }) {
  const navigate = useNavigate()
  const [data, setData] = useState<UnfurlData | null>(() => {
    const k = `${link.kind}:${link.id}`
    return cache.has(k) ? cache.get(k) ?? null : null
  })
  const [loading, setLoading] = useState(!cache.has(`${link.kind}:${link.id}`))

  useEffect(() => {
    let active = true
    if (!cache.has(`${link.kind}:${link.id}`)) {
      setLoading(true)
      fetchUnfurl(link).then(d => {
        if (!active) return
        setData(d)
        setLoading(false)
      })
    }
    return () => { active = false }
  }, [link.kind, link.id])

  const openTarget = () => {
    if (link.kind === 'project') navigate(`/app/projects/${link.id}`)
    else if (link.kind === 'task') navigate(`/app/tasks?highlight=${link.id}`)
    else navigate(`/app/issues?open=${link.id}`)
  }

  if (loading) {
    return (
      <div className="mt-1.5 border-l-2 border-[var(--primary)]/40 bg-[var(--surface-2)] rounded-r-[var(--r-sm)] px-3 py-2">
        <div className="h-3 w-20 rounded bg-[var(--line-2)] animate-pulse" />
        <div className="h-3 w-40 rounded bg-[var(--line-2)] animate-pulse mt-2" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mt-1.5 border-l-2 border-[var(--line-2)] bg-[var(--surface-2)] rounded-r-[var(--r-sm)] px-3 py-2 text-[11.5px] text-[var(--ink-500)]">
        Preview unavailable — link may be deleted or private.
      </div>
    )
  }

  const Icon =
    link.kind === 'project' ? Folder :
    link.kind === 'task' ? ClipboardList :
    AlertTriangle

  const kindLabel = link.kind === 'project' ? 'Project' : link.kind === 'task' ? 'Task' : 'Issue'

  return (
    <button
      type="button"
      onClick={openTarget}
      className="group mt-1.5 w-full text-left border-l-2 border-[var(--primary)] bg-[var(--surface-2)] hover:bg-[var(--primary-50)] rounded-r-[var(--r-md)] px-3 py-2 transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 w-6 h-6 rounded-[var(--r-xs)] bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 ring-1 ring-inset ring-[var(--primary)]/20">
          <Icon size={12} strokeWidth={2.2} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="eyebrow text-[var(--primary)] text-[9.5px]">{kindLabel}</span>
            {'key' in data && data.key && (
              <span className="font-mono tabular-nums text-[10px] text-[var(--ink-400)]">· {data.key}</span>
            )}
          </div>
          <p className="text-[13px] font-semibold text-[var(--ink-900)] truncate leading-tight">
            {'title' in data ? data.title : data.name}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <StatusPill status={data.status} />
            {data.priority && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_TONE[data.priority] ?? 'text-[var(--ink-500)]'}`}>
                <span className="w-1 h-1 rounded-full bg-current" />
                {data.priority}
              </span>
            )}
            {'assignee_name' in data && data.assignee_name && (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--ink-500)]">
                <UserIcon size={9} />
                {data.assignee_name}
              </span>
            )}
            {'raised_by_name' in data && (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--ink-500)]">
                <UserIcon size={9} />
                by {data.raised_by_name}
              </span>
            )}
            {'due_date' in data && data.due_date && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-mono tabular-nums text-[var(--ink-500)]">
                <CalendarClock size={9} />
                {format(new Date(data.due_date), 'MMM d')}
              </span>
            )}
            {'entity_name' in data && (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--ink-500)] truncate">
                on {data.entity_name}
              </span>
            )}
          </div>
        </div>
        <ArrowUpRight size={13} className="text-[var(--ink-400)] group-hover:text-[var(--primary)] shrink-0 transition-colors" />
      </div>
    </button>
  )
}

export function LinkUnfurls({ text }: { text: string }) {
  const links = parseUnfurlLinks(text)
  if (links.length === 0) return null
  return (
    <div className="mt-0.5 space-y-1.5">
      {links.map(link => (
        <UnfurlCard key={`${link.kind}:${link.id}`} link={link} />
      ))}
    </div>
  )
}
