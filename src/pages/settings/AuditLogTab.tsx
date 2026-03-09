import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { useAuditLog } from '../../hooks/useAuditLog'
import { timeAgo } from '../../utils/helpers'
import { SkeletonRow } from '../../shared/SkeletonCard'

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  deactivated: 'bg-orange-100 text-orange-700',
  reactivated: 'bg-teal-100 text-teal-700',
  invited: 'bg-purple-100 text-purple-700',
  archived: 'bg-gray-100 text-gray-600',
}

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k))
  return key ? ACTION_COLORS[key] : 'bg-gray-100 text-gray-600'
}

const PAGE_SIZE = 20

export function AuditLogTab() {
  const { logs, loading, total, fetchLogs } = useAuditLog()
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')

  useEffect(() => {
    fetchLogs(page, actionFilter ? { action: actionFilter } : undefined)
  }, [page, actionFilter])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Filter size={14} />
          <span>Filter:</span>
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="deactivated">Deactivated</option>
          <option value="reactivated">Reactivated</option>
          <option value="invited">Invited</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">When</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRow count={8} />
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">No audit log entries found</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                    {(log as any).performer?.name || 'System'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="capitalize">{log.target_type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {log.details ? (
                      typeof log.details === 'string' ? log.details : JSON.stringify(log.details)
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Page {page}{totalPages > 0 ? ` of ${totalPages}` : ''} · {total} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
