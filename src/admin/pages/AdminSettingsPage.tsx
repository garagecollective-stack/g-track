import { useState } from 'react'
import { Shield, Key, Database, Info, Copy, Check } from 'lucide-react'
import { useAdmin } from '../context/AdminContext'
import { supabaseAdminAuth } from '../../lib/supabaseAdmin'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { useAdminDepts } from '../hooks/useAdminDepts'
import { friendlyError } from '../../utils/helpers'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy}
      className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}

export function AdminSettingsPage() {
  const { adminUser } = useAdmin()
  const { users } = useAdminUsers()
  const { depts } = useAdminDepts()
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwdMsg,  setPwdMsg]  = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving,  setSaving]  = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMsg(null)
    if (!adminUser?.email) { setPwdMsg({ type: 'error', text: 'Admin session not found' }); return }
    if (!currentPwd) { setPwdMsg({ type: 'error', text: 'Current password is required' }); return }
    if (newPwd.length < 12) { setPwdMsg({ type: 'error', text: 'Password must be at least 12 characters' }); return }
    if (!/[A-Z]/.test(newPwd) || !/[a-z]/.test(newPwd) || !/[0-9]/.test(newPwd) || !/[^A-Za-z0-9]/.test(newPwd)) {
      setPwdMsg({ type: 'error', text: 'Use upper, lower, number, and symbol characters' })
      return
    }
    if (newPwd !== confirm)  { setPwdMsg({ type: 'error', text: 'Passwords do not match' }); return }
    setSaving(true)
    try {
      const { error: reauthError } = await supabaseAdminAuth.auth.signInWithPassword({
        email: adminUser.email,
        password: currentPwd,
      })
      if (reauthError) throw reauthError

      const { error } = await supabaseAdminAuth.auth.updateUser({ password: newPwd })
      if (error) throw error
      setPwdMsg({ type: 'success', text: 'Password updated successfully' })
      setCurrentPwd(''); setNewPwd(''); setConfirm('')
    } catch (err) {
      setPwdMsg({ type: 'error', text: friendlyError(err) })
    } finally {
      setSaving(false)
    }
  }

  const stats = {
    total:     users.filter(u => u.role !== 'super_admin').length,
    active:    users.filter(u => u.is_active && u.role !== 'super_admin').length,
    directors: users.filter(u => u.role === 'director').length,
    teamLeads: users.filter(u => u.role === 'teamLead').length,
    members:   users.filter(u => u.role === 'member').length,
    depts:     depts.length,
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[var(--ink-900)]" style={{ letterSpacing: '-0.5px' }}>Settings</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1">System configuration and admin account</p>
      </div>

      <div className="space-y-5">
        {/* Admin Account */}
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--line-1)]">
            <Shield size={16} className="text-[var(--primary)]" />
            <h2 className="text-base font-bold text-[var(--ink-900)]">Admin Account</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-sm">
              <div>
                <p className="text-xs font-medium text-[var(--ink-500)] mb-1">Name</p>
                <p className="font-semibold text-[var(--ink-900)]">{adminUser?.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--ink-500)] mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[var(--ink-900)]">{adminUser?.email}</p>
                  <CopyButton text={adminUser?.email || ''} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--ink-500)] mb-1">Role</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Super Admin</span>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--ink-500)] mb-1">Login URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-[var(--surface-2)] px-2 py-1 rounded-[var(--r-sm)] font-mono">/super-admin/login</code>
                  <CopyButton text={`${window.location.origin}/super-admin/login`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--line-1)]">
            <Key size={16} className="text-[var(--primary)]" />
            <h2 className="text-base font-bold text-[var(--ink-900)]">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Current Password</label>
                <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">New Password</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--ink-700)] mb-1.5">Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2.5 border border-[var(--line-1)] rounded-[var(--r-lg)] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" />
              </div>
            </div>
            {pwdMsg && (
              <p className={`text-xs px-3 py-2.5 rounded-[var(--r-lg)] border ${
                pwdMsg.type === 'success'
                  ? 'text-green-700 bg-green-50 border-green-100'
                  : 'text-red-600 bg-red-50 border-red-100'
              }`}>{pwdMsg.text}</p>
            )}
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-[var(--r-lg)] hover:bg-[var(--primary-700)] disabled:opacity-50 transition-colors">
              {saving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* System Info */}
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--line-1)]">
            <Database size={16} className="text-[var(--primary)]" />
            <h2 className="text-base font-bold text-[var(--ink-900)]">System Info</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Total Users',   value: stats.total },
                { label: 'Active Users',  value: stats.active },
                { label: 'Departments',   value: stats.depts },
                { label: 'Directors',     value: stats.directors },
                { label: 'Team Leads',    value: stats.teamLeads },
                { label: 'Members',       value: stats.members },
              ].map(s => (
                <div key={s.label} className="p-3 bg-[var(--surface-2)] rounded-[var(--r-lg)]">
                  <p className="text-2xl font-black text-[var(--ink-900)]" style={{ fontFamily: 'IBM Plex Mono' }}>{s.value}</p>
                  <p className="text-xs text-[var(--ink-500)] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-[var(--r-lg)] border bg-green-50 border-green-100">
              <Info size={15} className="text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-700">Admin writes are server-verified</p>
                <p className="text-xs mt-0.5 text-green-600">
                  Privileged user creation, updates, and deletion now run through edge functions instead of a browser service-role client.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Access Info */}
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-[var(--ink-900)]">Admin Access Reference</h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {[
              { label: 'Login URL',   value: '/super-admin/login'     },
              { label: 'Dashboard',  value: '/super-admin/dashboard'  },
              { label: 'Provisioning', value: 'Bootstrap super_admin outside the frontend' },
              { label: 'Passwords',   value: 'No default credentials are shipped' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-[var(--ink-500)] w-20 shrink-0">{r.label}:</span>
                <code className="text-[var(--primary)] bg-[var(--surface-2)] px-2 py-0.5 rounded flex-1">{r.value}</code>
                <CopyButton text={r.value} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
