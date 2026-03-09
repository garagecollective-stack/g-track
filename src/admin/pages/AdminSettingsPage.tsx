import { useState } from 'react'
import { Shield, Key, Database, Info, Copy, Check } from 'lucide-react'
import { useAdmin } from '../context/AdminContext'
import { supabaseAdmin, hasServiceRole } from '../../lib/supabaseAdmin'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { useAdminDepts } from '../hooks/useAdminDepts'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy}
      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}

export function AdminSettingsPage() {
  const { adminUser } = useAdmin()
  const { users } = useAdminUsers()
  const { depts } = useAdminDepts()
  const [newPwd,  setNewPwd]  = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwdMsg,  setPwdMsg]  = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving,  setSaving]  = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMsg(null)
    if (newPwd.length < 6) { setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters' }); return }
    if (newPwd !== confirm)  { setPwdMsg({ type: 'error', text: 'Passwords do not match' }); return }
    setSaving(true)
    try {
      const { error } = await supabaseAdmin.auth.updateUser({ password: newPwd })
      if (error) throw error
      setPwdMsg({ type: 'success', text: 'Password updated successfully' })
      setNewPwd(''); setConfirm('')
    } catch (err) {
      setPwdMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password' })
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
        <h1 className="text-2xl md:text-3xl font-black text-gray-900" style={{ letterSpacing: '-0.5px' }}>Settings</h1>
        <p className="text-sm text-gray-500 mt-1">System configuration and admin account</p>
      </div>

      <div className="space-y-5">
        {/* Admin Account */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Shield size={16} className="text-[#0A5540]" />
            <h2 className="text-base font-bold text-gray-900">Admin Account</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
                <p className="font-semibold text-gray-900">{adminUser?.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{adminUser?.email}</p>
                  <CopyButton text={adminUser?.email || ''} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Role</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Super Admin</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Login URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-mono">/super-admin/login</code>
                  <CopyButton text={`${window.location.origin}/super-admin/login`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Key size={16} className="text-[#0A5540]" />
            <h2 className="text-base font-bold text-gray-900">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">New Password</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10" />
              </div>
            </div>
            {pwdMsg && (
              <p className={`text-xs px-3 py-2.5 rounded-xl border ${
                pwdMsg.type === 'success'
                  ? 'text-green-700 bg-green-50 border-green-100'
                  : 'text-red-600 bg-red-50 border-red-100'
              }`}>{pwdMsg.text}</p>
            )}
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0A5540] rounded-xl hover:bg-[#0d6b51] disabled:opacity-50 transition-colors">
              {saving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* System Info */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Database size={16} className="text-[#0A5540]" />
            <h2 className="text-base font-bold text-gray-900">System Info</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Total Users',   value: stats.total },
                { label: 'Active Users',  value: stats.active },
                { label: 'Departments',   value: stats.depts },
                { label: 'Directors',     value: stats.directors },
                { label: 'Team Leads',    value: stats.teamLeads },
                { label: 'Members',       value: stats.members },
              ].map(s => (
                <div key={s.label} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-black text-gray-900" style={{ fontFamily: 'DM Mono' }}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Service Role Status */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              hasServiceRole
                ? 'bg-green-50 border-green-100'
                : 'bg-yellow-50 border-yellow-100'
            }`}>
              <Info size={15} className={hasServiceRole ? 'text-green-600 mt-0.5 shrink-0' : 'text-yellow-600 mt-0.5 shrink-0'} />
              <div>
                <p className={`text-xs font-semibold ${hasServiceRole ? 'text-green-700' : 'text-yellow-700'}`}>
                  {hasServiceRole ? 'Service Role Key Configured' : 'Service Role Key Not Configured'}
                </p>
                <p className={`text-xs mt-0.5 ${hasServiceRole ? 'text-green-600' : 'text-yellow-600'}`}>
                  {hasServiceRole
                    ? 'Full admin API access enabled. User creation and deletion works.'
                    : 'Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local for full admin capabilities (user creation via admin API).'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Access Info */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-[#0A5540]" />
            <h3 className="text-sm font-bold text-gray-900">Admin Access Reference</h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {[
              { label: 'Login URL',   value: '/super-admin/login'     },
              { label: 'Dashboard',  value: '/super-admin/dashboard'  },
              { label: 'Email',      value: 'superadmin@gtrack.local' },
              { label: 'Password',   value: 'admin123 (change this!)' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-gray-500 w-20 shrink-0">{r.label}:</span>
                <code className="text-[#0A5540] bg-gray-50 px-2 py-0.5 rounded flex-1">{r.value}</code>
                <CopyButton text={r.value} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
