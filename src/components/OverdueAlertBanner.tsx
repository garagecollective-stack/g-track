import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, X, ArrowRight, Folder, CheckSquare } from 'lucide-react'
import { useOverdueAlerts } from '../hooks/useOverdueAlerts'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { formatDateShort } from '../utils/helpers'
import { useNavigate } from 'react-router-dom'
import type { OverdueAlert } from '../types'

export function OverdueAlertBanner() {
  const { alerts, dismissAlert, dismissAll } = useOverdueAlerts()
  const [expanded, setExpanded] = useState(false)
  const [dismissing, setDismissing] = useState<string[]>([])
  const [showDismissAllConfirm, setShowDismissAllConfirm] = useState(false)
  const navigate = useNavigate()

  if (alerts.length === 0) return null

  const handleDismiss = async (id: string) => {
    setDismissing(prev => [...prev, id])
    await dismissAlert(id)
  }

  const handleDismissAll = async () => {
    await dismissAll()
    setExpanded(false)
  }

  const handleNavigate = (alert: OverdueAlert) => {
    if (alert.entity_type === 'project') {
      navigate(`/app/projects/${alert.entity_id}`)
    } else {
      navigate(`/app/tasks?highlight=${alert.entity_id}`)
    }
  }

  return (
    <>
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
        {/* Collapsed header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-800">
              {alerts.length} overdue {alerts.length === 1 ? 'item' : 'items'} need your attention
            </span>
          </div>
          <button
            onClick={() => setExpanded(p => !p)}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
          >
            {expanded ? (
              <><ChevronUp size={14} /> Hide</>
            ) : (
              <><ChevronDown size={14} /> View All</>
            )}
          </button>
        </div>

        {/* Expanded list */}
        {expanded && (
          <div className="border-t border-amber-200">
            <div className="flex items-center justify-between px-4 py-2 bg-amber-100/50">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                Overdue Items ({alerts.length})
              </span>
              <button
                onClick={() => setShowDismissAllConfirm(true)}
                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                <X size={12} /> Dismiss All
              </button>
            </div>

            <div className="divide-y divide-amber-100">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-opacity ${
                    dismissing.includes(alert.id) ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {/* Icon */}
                  <div className="shrink-0 text-amber-600">
                    {alert.entity_type === 'project' ? (
                      <Folder size={16} />
                    ) : (
                      <CheckSquare size={16} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">{alert.entity_name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">
                        {alert.entity_type}
                      </span>
                      <span className="text-xs font-medium text-red-600">
                        {alert.days_overdue} {alert.days_overdue === 1 ? 'day' : 'days'} overdue
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {alert.department && (
                        <span className="text-xs text-gray-500">{alert.department}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        Due {formatDateShort(alert.due_date)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleNavigate(alert)}
                      className="p-1.5 text-amber-600 hover:text-amber-900 hover:bg-amber-200 rounded-lg transition-colors"
                      title="View"
                    >
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1.5 text-amber-500 hover:text-amber-800 hover:bg-amber-200 rounded-lg transition-colors"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDismissAllConfirm}
        onClose={() => setShowDismissAllConfirm(false)}
        onConfirm={handleDismissAll}
        title="Dismiss All Alerts"
        description={`Dismiss all ${alerts.length} overdue alert${alerts.length !== 1 ? 's' : ''}? You won't see them again.`}
        confirmLabel="Dismiss All"
        variant="warning"
      />
    </>
  )
}
