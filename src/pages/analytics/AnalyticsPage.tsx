import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import { useApp } from '../../context/AppContext'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { isOverdue } from '../../utils/helpers'

const COLORS = { backlog: '#F97316', inProgress: '#3b82f6', done: '#16a273' }
const tooltipStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontFamily: 'IBM Plex Sans' }

function StatCard({ label, value, sub, color = 'text-[var(--ink-900)]' }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5">
      <p className="text-sm text-[var(--ink-500)]">{label}</p>
      <p className={`text-2xl md:text-3xl font-bold mt-2 ${color}`} style={{ fontFamily: 'IBM Plex Mono' }}>{value}</p>
      {sub && <p className="text-xs text-[var(--ink-400)] mt-1">{sub}</p>}
    </div>
  )
}

export function AnalyticsPage() {
  const { currentUser } = useApp()
  const filters = currentUser?.role === 'member' ? { assigneeId: currentUser.id } : currentUser?.role === 'teamLead' ? { department: currentUser.department || undefined } : {}
  const { tasks, loading: taskLoading } = useTasks(filters)
  const { projects } = useProjects()

  const total = tasks.length
  const completed = tasks.filter(t => t.status === 'done').length
  const overdue = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const byDept = useMemo(() => {
    const depts: Record<string, { backlog: number; inProgress: number; done: number; onHold: number }> = {}
    tasks.forEach(t => {
      if (!depts[t.department]) depts[t.department] = { backlog: 0, inProgress: 0, done: 0, onHold: 0 }
      depts[t.department][t.status]++
    })
    return Object.entries(depts).map(([name, counts]) => ({ name: name.length > 8 ? name.slice(0, 8) + '…' : name, ...counts }))
  }, [tasks])

  const statusDist = [
    { name: 'Backlog', value: tasks.filter(t => t.status === 'backlog').length },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'inProgress').length },
    { name: 'Done', value: tasks.filter(t => t.status === 'done').length },
  ]

  const projectProgress = useMemo(() =>
    projects.slice(0, 8).map(p => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
      progress: p.progress,
    }))
  , [projects])

  const title = currentUser?.role === 'director' ? 'Company' : currentUser?.department || 'Your'

  return (
    <div className="px-4 py-4 md:px-6 md:py-5 xl:py-6 max-w-[1440px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--ink-900)]" style={{ letterSpacing: '-0.5px' }}>Analytics</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1">Performance overview across {title}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6">
        <StatCard label="Total Tasks" value={total} color="text-purple-600" />
        <StatCard label="Completed" value={completed} sub={`${completionRate}% completion rate`} color="text-green-600" />
        <StatCard label="Overdue" value={overdue} sub="need immediate action" color="text-red-500" />
        <StatCard label="Total Projects" value={projects.length} sub={`${completedProjects} completed`} color="text-blue-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Chart 1: Tasks by department */}
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5">
          <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-4">Tasks by Department</h3>
          {taskLoading ? (
            <div className="skeleton h-[200px] md:h-[280px] rounded-[var(--r-sm)]" />
          ) : byDept.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-[var(--ink-400)]">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byDept} style={{ fontFamily: 'IBM Plex Sans' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="backlog" name="Backlog" stackId="a" fill={COLORS.backlog} />
                <Bar dataKey="inProgress" name="In Progress" stackId="a" fill={COLORS.inProgress} />
                <Bar dataKey="done" name="Done" stackId="a" fill={COLORS.done} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 2: Status distribution */}
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5">
          <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-4">Status Distribution</h3>
          {taskLoading ? (
            <div className="skeleton h-[200px] md:h-[280px] rounded-[var(--r-sm)]" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart style={{ fontFamily: 'IBM Plex Sans' }}>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {statusDist.map((_, i) => (
                    <Cell key={i} fill={[COLORS.backlog, COLORS.inProgress, COLORS.done][i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value, entry) => `${value} (${((entry as { payload?: { value?: number } })?.payload?.value) ?? 0})`}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 3: Project progress */}
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-5">
          <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-4">Project Progress</h3>
          {projectProgress.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-[var(--ink-400)]">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={projectProgress} layout="vertical" style={{ fontFamily: 'IBM Plex Sans' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Progress']} />
                <Bar dataKey="progress" fill="#0A5540" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
