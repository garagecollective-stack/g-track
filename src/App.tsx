import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { AdminProvider } from './admin/context/AdminContext'
import { DashboardLayout } from './layouts/DashboardLayout'
import { AdminLayout } from './admin/layouts/AdminLayout'
import { AdminLoginPage } from './admin/pages/AdminLoginPage'
import { AdminOverviewPage } from './admin/pages/AdminOverviewPage'
import { AdminUsersPage } from './admin/pages/AdminUsersPage'
import { AdminDepartmentsPage } from './admin/pages/AdminDepartmentsPage'
import { AdminHierarchyPage } from './admin/pages/AdminHierarchyPage'
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage'
import { AdminSetupPage } from './admin/pages/AdminSetupPage'
import { SignInPage } from './pages/auth/SignInPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { TasksPage } from './pages/tasks/TasksPage'
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage'
import { TeamPage } from './pages/team/TeamPage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { CalendarPage } from './pages/calendar/CalendarPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { TodoPage } from './pages/todos/TodoPage'
import { IssuesPage } from './pages/issues/IssuesPage'
import { LoadingSpinner } from './shared/LoadingSpinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useApp()
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  if (!currentUser) return <Navigate to="/" replace />
  return <>{children}</>
}

function TeamRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp()
  if (currentUser?.role === 'member') return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

function DirectorRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp()
  if (currentUser?.role !== 'director') return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

function IssueRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp()
  if (currentUser?.role === 'member') return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Super Admin (completely isolated context) ── */}
        <Route path="/super-admin/*" element={
          <AdminProvider>
            <Routes>
              <Route path="login"       element={<AdminLoginPage />} />
              <Route path="setup"       element={<AdminSetupPage />} />
              <Route element={<AdminLayout />}>
                <Route index            element={<Navigate to="/super-admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminOverviewPage />} />
                <Route path="users"     element={<AdminUsersPage />} />
                <Route path="departments" element={<AdminDepartmentsPage />} />
                <Route path="hierarchy" element={<AdminHierarchyPage />} />
                <Route path="settings"  element={<AdminSettingsPage />} />
              </Route>
              <Route path="*"           element={<Navigate to="/super-admin/login" replace />} />
            </Routes>
          </AdminProvider>
        } />

        {/* ── Main App ── */}
        <Route path="/*" element={
          <AppProvider>
            <Routes>
              <Route path="/"               element={<SignInPage />} />
              <Route path="/signup"         element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              <Route path="/app" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index              element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard"   element={<DashboardPage />} />
                <Route path="tasks"       element={<TasksPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="team"        element={<TeamRoute><TeamPage /></TeamRoute>} />
                <Route path="analytics"   element={<AnalyticsPage />} />
                <Route path="calendar"    element={<CalendarPage />} />
                <Route path="profile"     element={<ProfilePage />} />
                <Route path="todos"       element={<TodoPage />} />
                <Route path="settings"    element={<DirectorRoute><SettingsPage /></DirectorRoute>} />
                <Route path="issues"      element={<IssueRoute><IssuesPage /></IssueRoute>} />
              </Route>

              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          </AppProvider>
        } />
      </Routes>
    </BrowserRouter>
  )
}
