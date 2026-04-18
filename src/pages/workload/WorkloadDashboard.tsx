import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { X, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTasks } from '../../hooks/useTasks'
import { useTeam } from '../../hooks/useTeam'
import { useDepartments } from '../../hooks/useDepartments'
import { LoadingSpinner } from '../../shared/LoadingSpinner'

const STATUS_COLORS = {
  Backlog: '#F97316',
  'In Progress': '#3b82f6',
  Done: '#16a273',
} as const

const tooltipStyle = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '13px',
  fontFamily: 'IBM Plex Sans',
}

interface WorkloadRow {
  id: string
  name: string
  Backlog: number
  'In Progress': number
  Done: number
}

export function WorkloadDashboard() {
  const { currentUser } = useApp()
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)

  const { departments, loading: deptsLoading } = useDepartments()
  const { members, loading: membersLoading } = useTeam()

  const isDirector = currentUser?.role === 'director'
  const isLead = currentUser?.role === 'teamLead'
  const isMember = currentUser?.role === 'member'

  const selectedDept = selectedDeptId ? departments.find(d => d.id === selectedDeptId) ?? null : null

  // Determine filter for useTasks based on role + drill-down state
  const deptFilter = isLead
    ? currentUser?.department ?? undefined
    : isDirector && selectedDept
    ? selectedDept.name
    : undefined

  const assigneeFilter = isMember ? currentUser?.id : undefined

  const { tasks, loading: tasksLoading } = useTasks({ department: deptFilter, assigneeId: assigneeFilter })

  const loading = tasksLoading || deptsLoading || membersLoading

  const rows: WorkloadRow[] = useMemo(() => {
    if (!currentUser) return []

    if (isMember) {
      return [{
        id: currentUser.id,
        name: 'My Tasks',
        Backlog: tasks.filter(t => t.status === 'backlog').length,
        'In Progress': tasks.filter(t => t.status === 'inProgress').length,
        Done: tasks.filter(t => t.status === 'done').length,
      }]
    }

    if (isLead || (isDirector && selectedDeptId)) {
      const scopeDeptName = isLead ? currentUser.department : selectedDept?.name
      const scopedMembers = members.filter(
        m => m.department === scopeDeptName && m.role !== 'director' && m.role !== 'super_admin'
      )
      return scopedMembers.map(m => ({
        id: m.id,
        name: m.name.split(' ')[0],
        Backlog: tasks.filter(t => t.assignee_id === m.id && t.status === 'backlog').length,
        'In Progress': tasks.filter(t => t.assignee_id === m.id && t.status === 'inProgress').length,
        Done: tasks.filter(t => t.assignee_id === m.id && t.status === 'done').length,
      }))
    }

    // Director, no filter → group all tasks by department
    if (isDirector) {
      const deptMap: Record<string, WorkloadRow> = {}
      departments.forEach(d => {
        deptMap[d.name] = { id: d.id, name: d.name, Backlog: 0, 'In Progress': 0, Done: 0 }
      })
      tasks.forEach(t => {
        if (deptMap[t.department]) {
          if (t.status === 'backlog') deptMap[t.department].Backlog++
          else if (t.status === 'inProgress') deptMap[t.department]['In Progress']++
          else if (t.status === 'done') deptMap[t.department].Done++
        }
      })
      return Object.values(deptMap)
    }

    return []
  }, [tasks, isMember, isLead, isDirector, selectedDeptId, selectedDept, members, departments, currentUser])

  const handleChartClick = (data: { activePayload?: { payload: WorkloadRow }[] } | null) => {
    if (!isDirector || selectedDeptId) return
    const row = data?.activePayload?.[0]?.payload
    if (row?.id) setSelectedDeptId(row.id)
  }

  const subtitle = isDirector && !selectedDeptId
    ? 'Click a team bar to drill into member view'
    : isDirector && selectedDept
    ? `Member-level breakdown for ${selectedDept.name}`
    : isLead
    ? `Task distribution across ${currentUser?.department ?? 'your team'}`
    : 'Your current task breakdown by status'

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink-900)]" style={{ letterSpacing: '-0.5px' }}>
            Workload
          </h1>
          <p className="text-sm text-[var(--ink-500)] mt-1">{subtitle}</p>
        </div>

        {/* Director filter controls */}
        {isDirector && (
          <div className="flex items-center gap-2">
            <select
              value={selectedDeptId ?? ''}
              onChange={e => setSelectedDeptId(e.target.value || null)}
              className="text-sm border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2 bg-[var(--surface-1)] text-[var(--ink-700)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/15"
            >
              <option value="">All Teams</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {selectedDeptId && (
              <button
                onClick={() => setSelectedDeptId(null)}
                className="flex items-center gap-1.5 text-sm text-[var(--ink-500)] hover:text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <X size={14} />
                Clear Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Director drill-down breadcrumb */}
      {isDirector && selectedDept && (
        <div className="flex items-center gap-2 text-sm mb-5">
          <button
            onClick={() => setSelectedDeptId(null)}
            className="text-[var(--primary)] hover:underline font-medium"
          >
            All Teams
          </button>
          <ChevronRight size={14} className="text-[var(--ink-400)]" />
          <span className="text-[var(--ink-700)] font-medium">{selectedDept.name}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Member view: three status stat cards */}
          {isMember && rows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['Backlog', 'In Progress', 'Done'] as const).map(status => (
                <div key={status} className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: STATUS_COLORS[status] }}
                    />
                    <span className="text-sm text-[var(--ink-500)]">{status}</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'IBM Plex Mono' }}>
                    {rows[0][status]}
                  </p>
                  <p className="text-xs text-[var(--ink-400)] mt-1">tasks</p>
                </div>
              ))}
            </div>
          )}

          {/* Bar chart for lead / director views */}
          {!isMember && rows.length > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5">
              {isDirector && !selectedDeptId && (
                <p className="text-xs text-[var(--ink-400)] mb-4">Click a bar to drill down into that team</p>
              )}
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={rows}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  onClick={handleChartClick as never}
                  style={{ cursor: isDirector && !selectedDeptId ? 'pointer' : 'default' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Backlog" fill={STATUS_COLORS.Backlog} radius={[3, 3, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="In Progress" fill={STATUS_COLORS['In Progress']} radius={[3, 3, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Done" fill={STATUS_COLORS.Done} radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-12 text-center">
              <p className="text-[var(--ink-400)] text-sm">No task data to display.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
