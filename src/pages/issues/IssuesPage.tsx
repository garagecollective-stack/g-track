import { useState, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { useIssues } from '../../hooks/useIssues'
import { IssueDetailDrawer } from '../../modals/IssueDetailDrawer'
import { SearchInput } from '../../shared/SearchInput'
import { timeAgo } from '../../utils/helpers'
import type { Issue, IssueStatus } from '../../types'

type TabFilter = 'all' | IssueStatus

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_review: 'In Review',
  resolved: 'Resolved',
  closed: 'Closed',
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
}

const ENTITY_ICON: Record<string, string> = {
  project: '📁',
  task: '✓',
}

export function IssuesPage() {
  const { issues, loading, fetchIssues } = useIssues()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [raisedByFilter, setRaisedByFilter] = useState('')
  const [openIssue, setOpenIssue] = useState<Issue | null>(null)

  const depts = [...new Set(issues.map(i => i.department))].filter(Boolean).sort()
  const raisedByOptions = [...new Set(issues.map(i => i.raised_by_name))].sort()

  const tabCounts = useMemo(() => ({
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    in_review: issues.filter(i => i.status === 'in_review').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    closed: issues.filter(i => i.status === 'closed').length,
  }), [issues])

  const filtered = useMemo(() => issues.filter(i => {
    if (activeTab !== 'all' && i.status !== activeTab) return false
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false
    if (priorityFilter && i.priority !== priorityFilter) return false
    if (deptFilter && i.department !== deptFilter) return false
    if (raisedByFilter && i.raised_by_name !== raisedByFilter) return false
    return true
  }), [issues, activeTab, search, priorityFilter, deptFilter, raisedByFilter])

  const TABS: { id: TabFilter; label: string }[] = [
    { id: 'all',       label: `All (${tabCounts.all})` },
    { id: 'open',      label: `Open (${tabCounts.open})` },
    { id: 'in_review', label: `In Review (${tabCounts.in_review})` },
    { id: 'resolved',  label: `Resolved (${tabCounts.resolved})` },
    { id: 'closed',    label: `Closed (${tabCounts.closed})` },
  ]

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.5px' }}>Issues</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage and respond to team queries</p>
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0A5540] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search issues..."
          className="flex-1 min-w-[180px]"
        />
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-[#0A5540]">
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {depts.length > 0 && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-[#0A5540]">
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {raisedByOptions.length > 0 && (
          <select value={raisedByFilter} onChange={e => setRaisedByFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-[#0A5540]">
            <option value="">All Raised By</option>
            {raisedByOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block bg-white border border-gray-100 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-spin w-6 h-6 border-2 border-[#0A5540] border-t-transparent rounded-full mx-auto mb-3" />
            Loading issues...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No {activeTab === 'all' ? '' : activeTab} issues</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Issue Title</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Raised By</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Related To</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(issue => (
                <tr
                  key={issue.id}
                  onClick={() => setOpenIssue(issue)}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority] || 'bg-gray-400'}`} />
                      <span className="text-sm font-medium text-gray-900">{issue.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{issue.raised_by_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {ENTITY_ICON[issue.entity_type]} {issue.entity_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      issue.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      issue.priority === 'high'   ? 'bg-orange-100 text-orange-700' :
                      issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                    }`}>
                      {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[issue.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[issue.status] || issue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{timeAgo(issue.updated_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 h-20 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No issues found</p>
          </div>
        ) : filtered.map(issue => (
          <div
            key={issue.id}
            onClick={() => setOpenIssue(issue)}
            className="bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority] || 'bg-gray-400'}`} />
                <p className="text-sm font-medium text-gray-900 truncate">{issue.title}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[issue.status] || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABEL[issue.status] || issue.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 pl-4">
              <span>{issue.raised_by_name} · {ENTITY_ICON[issue.entity_type]} {issue.entity_name}</span>
              <span>{timeAgo(issue.updated_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {openIssue && (
        <IssueDetailDrawer
          issue={openIssue}
          onClose={() => setOpenIssue(null)}
          onUpdate={fetchIssues}
        />
      )}
    </div>
  )
}
