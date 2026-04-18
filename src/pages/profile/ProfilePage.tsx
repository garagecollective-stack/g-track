import { useState } from 'react'
import { Mail, Pencil, LayoutDashboard, Settings2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../shared/Avatar'
import { RoleBadge, DeptBadge } from '../../shared/Badge'
import { ProgressBar } from '../../shared/ProgressBar'
import { StatusBadge } from '../../shared/StatusBadge'
import { LoadingSpinner } from '../../shared/LoadingSpinner'
import { Modal } from '../../shared/Modal'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { ProfileSettingsTab } from './ProfileSettingsTab'
import { isOverdue, friendlyError } from '../../utils/helpers'
import { useNavigate } from 'react-router-dom'
import type { UserStatus } from '../../types'

const STATUS_OPTS: { value: UserStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'away', label: 'Away', color: 'bg-yellow-500' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-400' },
]

type Tab = 'overview' | 'settings'

export function ProfilePage() {
  const { currentUser, refreshUser } = useApp()
  const { tasks } = useTasks({ assigneeId: currentUser?.id })
  const { projects } = useProjects()
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState(currentUser?.name || '')
  const [saving, setSaving] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<UserStatus | null>(null)

  if (!currentUser) return null

  const myTasks = tasks.filter(t => t.assignee_id === currentUser.id)
  const todo = myTasks.filter(t => t.status === 'backlog').length
  const active = myTasks.filter(t => t.status === 'inProgress').length
  const done = myTasks.filter(t => t.status === 'done').length
  const overdue = myTasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length
  const total = myTasks.length
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

  const doUpdateStatus = async () => {
    if (!pendingStatus) return
    setStatusUpdating(true)
    try {
      await supabase.from('profiles').update({ user_status: pendingStatus }).eq('id', currentUser.id)
      await refreshUser()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await supabase.from('profiles').update({ name: editName }).eq('id', currentUser.id)
      await refreshUser()
      toast.success('Profile updated')
      setShowEdit(false)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  const pendingStatusLabel = STATUS_OPTS.find(o => o.value === pendingStatus)?.label

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ]

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1280px] mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[var(--ink-900)] dark:text-[var(--ink-900)]" style={{ letterSpacing: '-0.5px' }}>
          My Profile
        </h1>
        <p className="text-sm text-[var(--ink-500)] dark:text-[var(--ink-400)] mt-1">
          Your account details and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-2)] dark:bg-[var(--surface-1)] rounded-[var(--r-lg)] w-fit mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-sm)] text-sm font-medium transition-all ${
              tab === id
                ? 'bg-[var(--surface-1)] dark:bg-[var(--surface-2)] text-[var(--ink-900)] dark:text-[var(--ink-900)] shadow-sm'
                : 'text-[var(--ink-500)] dark:text-[var(--ink-400)] hover:text-[var(--ink-700)] dark:hover:text-[var(--ink-400)]'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left column */}
          <div className="lg:w-72 xl:w-80 2xl:w-96 shrink-0 space-y-4">
            {/* Identity card */}
            <div className="bg-[var(--surface-1)] dark:bg-[var(--surface-1)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-lg)] p-5 text-center">
              <div className="flex justify-center mb-3">
                <Avatar name={currentUser.name} size="xl" status={currentUser.user_status} imageUrl={currentUser.avatar_url} />
              </div>
              <h2 className="text-lg font-bold text-[var(--ink-900)] dark:text-[var(--ink-900)]">{currentUser.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <RoleBadge role={currentUser.role} />
              </div>
              {currentUser.department && (
                <div className="flex justify-center mt-1.5"><DeptBadge department={currentUser.department} /></div>
              )}
              <p className="flex items-center justify-center gap-1.5 text-sm text-[var(--ink-500)] dark:text-[var(--ink-400)] mt-3">
                <Mail size={13} /> {currentUser.email}
              </p>
              <button
                onClick={() => { setEditName(currentUser.name); setShowEdit(true) }}
                className="mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--ink-700)] dark:text-[var(--ink-400)] border border-[var(--line-1)] dark:border-[var(--line-2)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)] transition-colors"
              >
                <Pencil size={13} /> Edit Profile
              </button>
            </div>

            {/* Status card */}
            <div className="bg-[var(--surface-1)] dark:bg-[var(--surface-1)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-lg)] p-4">
              <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wider mb-3">STATUS</p>
              <div className="space-y-1.5">
                {STATUS_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { if (currentUser.user_status !== opt.value) setPendingStatus(opt.value) }}
                    disabled={statusUpdating}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-sm)] transition-colors text-left ${
                      currentUser.user_status === opt.value
                        ? 'bg-[var(--primary-50)] dark:bg-[var(--primary)]/20 border border-[var(--primary)]/20'
                        : 'hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.color} shrink-0`} />
                    <span className="text-sm text-[var(--ink-900)] dark:text-[var(--ink-400)]">{opt.label}</span>
                    {currentUser.user_status === opt.value && (
                      <span className="ml-auto text-[var(--primary)] text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Completion rate */}
            <div className="bg-[var(--surface-1)] dark:bg-[var(--surface-1)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-lg)] p-5">
              <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-wider mb-3">⚡ COMPLETION RATE</p>
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--ink-900)] dark:text-[var(--ink-900)]" style={{ fontFamily: 'IBM Plex Mono' }}>{completionRate}%</p>
              <p className="text-sm text-[var(--ink-500)] dark:text-[var(--ink-400)] mt-1">{done} of {total} tasks done</p>
              <ProgressBar value={completionRate} className="mt-3" />
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Task stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'To Do', value: todo, color: 'text-orange-500' },
                { label: 'Active', value: active, color: 'text-blue-500' },
                { label: 'Done', value: done, color: 'text-green-500' },
                { label: 'Overdue', value: overdue, color: 'text-red-500', bg: overdue > 0 ? 'bg-red-50 dark:bg-red-900/20' : '' },
              ].map(s => (
                <div key={s.label} className={`${s.bg || 'bg-[var(--surface-1)] dark:bg-[var(--surface-1)]'} border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-lg)] p-4`}>
                  <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'IBM Plex Mono' }}>{s.value}</p>
                  <p className="text-xs text-[var(--ink-500)] dark:text-[var(--ink-400)] mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* My Projects */}
            <div>
              <h3 className="text-base font-semibold text-[var(--ink-900)] dark:text-[var(--ink-900)] mb-3">My Projects</h3>
              {projects.length === 0 ? (
                <div className="bg-[var(--surface-1)] dark:bg-[var(--surface-1)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-lg)] p-8 text-center text-sm text-[var(--ink-400)]">
                  Not in any projects yet
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.map(project => (
                    <div key={project.id}
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                      className="bg-[var(--surface-1)] dark:bg-[var(--surface-1)] border border-[var(--line-1)] dark:border-[var(--line-1)] rounded-[var(--r-lg)] p-4 cursor-pointer hover:border-[var(--primary)]/40 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-[var(--ink-900)] dark:text-[var(--ink-900)] truncate">{project.name}</h4>
                        <StatusBadge status={project.status} />
                      </div>
                      <ProgressBar value={project.progress} showLabel size="sm" />
                      <p className="text-xs text-[var(--ink-400)] mt-1">{project.client || project.department}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ProfileSettingsTab />
      )}

      {/* Edit name modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Profile" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] dark:text-[var(--ink-400)] block mb-1.5">Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full border border-[var(--line-1)] dark:border-[var(--line-2)] dark:bg-[var(--surface-2)] dark:text-[var(--ink-900)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowEdit(false)}
              className="px-4 py-2 text-sm font-medium text-[var(--ink-700)] dark:text-[var(--ink-400)] border border-[var(--line-1)] dark:border-[var(--line-2)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)] transition-colors">
              Cancel
            </button>
            <button onClick={() => setShowSaveConfirm(true)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-70">
              {saving && <LoadingSpinner size="sm" color="white" />} Save
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSaveProfile}
        title="Save Profile"
        description={`Update your display name to "${editName}"?`}
        confirmLabel="Save"
        variant="confirm"
      />

      <ConfirmDialog
        open={!!pendingStatus}
        onClose={() => setPendingStatus(null)}
        onConfirm={doUpdateStatus}
        title="Update Status"
        description={`Set your status to "${pendingStatusLabel}"?`}
        confirmLabel="Update"
        variant="confirm"
      />
    </div>
  )
}
