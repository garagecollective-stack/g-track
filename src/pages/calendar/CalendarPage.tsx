import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { StatusBadge } from '../../shared/StatusBadge'
import { isOverdue } from '../../utils/helpers'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface DayItem {
  type: 'project' | 'task'
  name: string
  status: string
  assignee?: string
  isOverdue?: boolean
}

export function CalendarPage() {
  const { currentUser } = useApp()
  const filters = currentUser?.role === 'member' ? { assigneeId: currentUser.id } : currentUser?.role === 'teamLead' ? { department: currentUser.department || undefined } : {}
  const { tasks } = useTasks(filters)
  const { projects } = useProjects()
  const [date, setDate] = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(null)

  const year = date.getFullYear()
  const month = date.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const itemsByDate = useMemo(() => {
    const map: Record<string, DayItem[]> = {}
    projects.forEach(p => {
      if (p.due_date) {
        const key = p.due_date
        if (!map[key]) map[key] = []
        map[key].push({ type: 'project', name: p.name, status: p.status })
      }
    })
    tasks.forEach(t => {
      if (t.due_date) {
        const key = t.due_date
        if (!map[key]) map[key] = []
        // Fix #7: compute overdue per task item
        const taskOverdue = (t.is_overdue || isOverdue(t.due_date)) && t.status !== 'done'
        map[key].push({ type: 'task', name: t.title, status: t.status, assignee: t.assignee_name || undefined, isOverdue: taskOverdue })
      }
    })
    return map
  }, [projects, tasks])

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const projectDeadlines = projects.filter(p => p.due_date?.startsWith(monthStr)).length
  const tasksDue = tasks.filter(t => t.due_date?.startsWith(monthStr)).length
  // Fix #7: collect all overdue tasks (across all months, not just current)
  const overdueTasks = tasks.filter(t => (t.is_overdue || isOverdue(t.due_date)) && t.status !== 'done')
  const overdueCount = overdueTasks.length

  const selectedKey = selected ? `${selected.getFullYear()}-${String(selected.getMonth()+1).padStart(2,'0')}-${String(selected.getDate()).padStart(2,'0')}` : null
  const selectedItems = selectedKey ? (itemsByDate[selectedKey] || []) : []

  const prevMonth = () => setDate(new Date(year, month - 1, 1))
  const nextMonth = () => setDate(new Date(year, month + 1, 1))
  const goToday = () => setDate(new Date())

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.5px' }}>Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">Deadlines and due dates at a glance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500">Project deadlines</p>
          <p className="text-2xl font-bold text-blue-600 mt-1" style={{ fontFamily: 'DM Mono' }}>{projectDeadlines}</p>
          <p className="text-xs text-gray-400">this month</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500">Tasks due</p>
          <p className="text-2xl font-bold text-blue-600 mt-1" style={{ fontFamily: 'DM Mono' }}>{tasksDue}</p>
          <p className="text-xs text-gray-400">this month</p>
        </div>
        <div className={`border rounded-xl p-4 ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <p className="text-xs text-gray-500">Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}`} style={{ fontFamily: 'DM Mono' }}>{overdueCount}</p>
          {overdueCount > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {overdueTasks.slice(0, 3).map(t => (
                <li key={t.id} className="text-[11px] text-red-600 truncate">⚠ {t.title}</li>
              ))}
              {overdueCount > 3 && <li className="text-[11px] text-red-400">+{overdueCount - 3} more</li>}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">need attention</p>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm font-semibold text-gray-900">
                {MONTHS[month]} {year}
              </h2>
              <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <button onClick={goToday}
              className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Today
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="border border-gray-50 bg-gray-50/30 min-h-[60px] md:min-h-[90px]" />
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isPast = new Date(year, month, day) < today && !isToday
              const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const items = itemsByDate[key] || []
              const isSelected = selected?.getDate() === day && selected?.getMonth() === month && selected?.getFullYear() === year
              // Fix #7: highlight cell if it has any overdue task
              const cellHasOverdue = items.some(i => i.isOverdue)

              return (
                <div
                  key={day}
                  onClick={() => setSelected(new Date(year, month, day))}
                  className={`border border-gray-50 min-h-[60px] md:min-h-[90px] p-1.5 cursor-pointer transition-colors hover:bg-gray-50 ${
                    isPast && !cellHasOverdue ? 'bg-gray-50/50' : ''
                  } ${cellHasOverdue ? 'bg-red-50/30' : ''} ${isSelected ? 'ring-2 ring-inset ring-[#0A5540]' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-[#0A5540] text-white' : cellHasOverdue ? 'text-red-600 font-bold' : 'text-gray-600'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 hidden md:block">
                    {items.slice(0, 2).map((item, i) => (
                      <div key={i}
                        className={`truncate text-[11px] rounded px-1.5 py-0.5 w-full ${
                          item.type === 'project'
                            ? 'bg-orange-100 text-orange-700'
                            : item.isOverdue
                            ? 'bg-red-100 text-red-700 font-semibold'   // Fix #7: red for overdue tasks
                            : 'text-gray-600'
                        }`}>
                        {item.type === 'task' && (item.isOverdue ? '⚠ ' : '✓ ')}{item.name}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <p className="text-[11px] text-[#0A5540] font-medium cursor-pointer">+{items.length - 2} more</p>
                    )}
                  </div>
                  {/* Mobile: just dot if has items */}
                  <div className="md:hidden">
                    {items.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-[#0A5540] mt-1" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="lg:w-72 xl:w-80 shrink-0 bg-white border border-gray-100 rounded-xl p-5">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <span className="text-3xl mb-2">📅</span>
              <p className="text-sm text-gray-400">Select a day to see details</p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                {MONTHS[selected.getMonth()]} {selected.getDate()}, {selected.getFullYear()}
              </h3>

              {selectedItems.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nothing due this day</p>
              ) : (
                <div className="space-y-4">
                  {/* Project deadlines */}
                  {selectedItems.filter(i => i.type === 'project').length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Project Deadlines ({selectedItems.filter(i => i.type === 'project').length})
                      </p>
                      <div className="space-y-1.5">
                        {selectedItems.filter(i => i.type === 'project').map((item, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="text-gray-400">📁</span>
                              <span className="text-sm text-gray-800 truncate">{item.name}</span>
                            </div>
                            <StatusBadge status={item.status as any} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {selectedItems.filter(i => i.type === 'task').length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Tasks Due ({selectedItems.filter(i => i.type === 'task').length})
                      </p>
                      <div className="space-y-1.5">
                        {selectedItems.filter(i => i.type === 'task').map((item, i) => (
                          <div key={i} className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-gray-400">✓</span>
                                <span className="text-sm text-gray-800 truncate">{item.name}</span>
                              </div>
                              <StatusBadge status={item.status as any} />
                            </div>
                            {item.assignee && <p className="text-xs text-gray-400 ml-5">{item.assignee}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
