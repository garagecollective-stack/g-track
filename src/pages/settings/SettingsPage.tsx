import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Tabs } from '../../shared/Tabs'
import { DepartmentsTab } from './DepartmentsTab'
import { UsersTab } from './UsersTab'
import { GeneralTab } from './GeneralTab'
import { AuditLogTab } from './AuditLogTab'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'departments', label: 'Departments' },
  { id: 'general', label: 'General' },
  { id: 'audit', label: 'Audit Log' },
]

export function SettingsPage() {
  const { currentUser } = useApp()
  const [activeTab, setActiveTab] = useState('users')

  if (currentUser?.role !== 'director') return <Navigate to="/app/dashboard" replace />

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--ink-900)]">Settings</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1">Manage your workspace, team, and preferences</p>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'audit' && <AuditLogTab />}
      </div>
    </div>
  )
}
