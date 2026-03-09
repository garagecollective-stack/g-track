import { Users, Building2, CheckSquare, ShieldCheck, TrendingUp, UserCheck, UserX, Activity } from 'lucide-react'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { useAdminDepts } from '../hooks/useAdminDepts'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { useState, useEffect } from 'react'
import { timeAgo } from '../../utils/helpers'

interface StatCardProps {
  icon: React.ElementType
  value: number | string
  label: string
  sub?: string
  iconColor: string
  iconBg: string
}

function StatCard({ icon: Icon, value, label, sub, iconColor, iconBg }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className="text-3xl font-black text-gray-900" style={{ fontFamily: 'DM Mono, monospace' }}>{value}</p>
      <p className="text-sm font-semibold text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function AdminOverviewPage() {
  const { users, loading: usersLoading } = useAdminUsers()
  const { depts, loading: deptsLoading } = useAdminDepts()
  const [taskCount, setTaskCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    supabaseAdmin.from('tasks').select('id', { count: 'exact', head: true })
      .then(({ count }) => setTaskCount(count || 0))
    supabaseAdmin.from('audit_logs')
      .select('*, performer:profiles(name)')
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setRecentActivity(data || []))
  }, [])

  const activeUsers = users.filter(u => u.is_active && u.role !== 'super_admin')
  const inactiveUsers = users.filter(u => !u.is_active)
  const directors = users.filter(u => u.role === 'director')
  const teamLeads = users.filter(u => u.role === 'teamLead')
  const members = users.filter(u => u.role === 'member')

  const roleBreakdown = [
    { label: 'Directors',  count: directors.length,  color: 'bg-[#edf8f4] text-[#0A5540]' },
    { label: 'Team Leads', count: teamLeads.length,  color: 'bg-purple-100 text-purple-700' },
    { label: 'Members',    count: members.length,     color: 'bg-blue-100 text-blue-700' },
  ]

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900" style={{ letterSpacing: '-0.5px' }}>
          Overview
        </h1>
        <p className="text-sm text-gray-500 mt-1">Company-wide statistics and activity</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
        <StatCard icon={Users}      value={usersLoading ? '—' : activeUsers.length}  label="Active Users"   sub={`${inactiveUsers.length} deactivated`}   iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard icon={Building2}  value={deptsLoading ? '—' : depts.length}        label="Departments"    sub="across the org"                          iconColor="text-blue-600"   iconBg="bg-blue-50" />
        <StatCard icon={CheckSquare} value={taskCount}                               label="Total Tasks"    sub="across all projects"                     iconColor="text-orange-500" iconBg="bg-orange-50" />
        <StatCard icon={ShieldCheck} value="1"                                       label="Super Admins"   sub="system administrators"                   iconColor="text-[#0A5540]"  iconBg="bg-[#edf8f4]" />
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Role breakdown + dept list */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Role Breakdown */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-[#0A5540]" />
              <h2 className="text-base font-bold text-gray-900">Role Breakdown</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {roleBreakdown.map(r => (
                <div key={r.label} className="p-4 rounded-xl border border-gray-100 text-center">
                  <p className="text-3xl font-black text-gray-900 mb-1" style={{ fontFamily: 'DM Mono' }}>
                    {r.count}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Departments</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {deptsLoading ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Loading...</p>
              ) : depts.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No departments</p>
              ) : depts.map(dept => {
                const deptUsers = users.filter(u => u.department === dept.name && u.role !== 'super_admin')
                const head = users.find(u => u.id === dept.department_head)
                return (
                  <div key={dept.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
                      {head && <p className="text-xs text-gray-400">Head: {head.name}</p>}
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {deptUsers.length} member{deptUsers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Status + recent activity */}
        <div className="lg:w-72 xl:w-80 shrink-0 space-y-4">
          {/* User Status */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">User Status</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck size={15} className="text-green-500" />
                  <span className="text-sm text-gray-700">Active</span>
                </div>
                <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'DM Mono' }}>
                  {activeUsers.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX size={15} className="text-red-400" />
                  <span className="text-sm text-gray-700">Deactivated</span>
                </div>
                <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'DM Mono' }}>
                  {inactiveUsers.length}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Activity size={14} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentActivity.length === 0 ? (
                <p className="px-4 py-6 text-xs text-gray-400 text-center">No activity yet</p>
              ) : recentActivity.map((log: any) => (
                <div key={log.id} className="px-4 py-2.5">
                  <p className="text-xs font-medium text-gray-900">{log.action}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[11px] text-gray-400">{log.performer?.name || 'System'}</p>
                    <p className="text-[11px] text-gray-400">{timeAgo(log.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
