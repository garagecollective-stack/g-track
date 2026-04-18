import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { ChatProvider } from './context/ChatContext'
import { AdminProvider } from './admin/context/AdminContext'
import { DashboardLayout } from './layouts/DashboardLayout'
import { AdminLayout } from './admin/layouts/AdminLayout'
import { SignInPage } from './pages/auth/SignInPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { TasksPage } from './pages/tasks/TasksPage'
import { LoadingSpinner } from './shared/LoadingSpinner'

// Heavy routes — loaded lazily to reduce initial bundle size
const AdminLoginPage       = lazy(() => import('./admin/pages/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })))
const AdminOverviewPage    = lazy(() => import('./admin/pages/AdminOverviewPage').then(m => ({ default: m.AdminOverviewPage })))
const AdminUsersPage       = lazy(() => import('./admin/pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminDepartmentsPage = lazy(() => import('./admin/pages/AdminDepartmentsPage').then(m => ({ default: m.AdminDepartmentsPage })))
const AdminHierarchyPage   = lazy(() => import('./admin/pages/AdminHierarchyPage').then(m => ({ default: m.AdminHierarchyPage })))
const AdminSettingsPage    = lazy(() => import('./admin/pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })))
const AdminSetupPage       = lazy(() => import('./admin/pages/AdminSetupPage').then(m => ({ default: m.AdminSetupPage })))
const ProjectDetailPage    = lazy(() => import('./pages/projects/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })))
const TeamPage             = lazy(() => import('./pages/team/TeamPage').then(m => ({ default: m.TeamPage })))
const AnalyticsPage        = lazy(() => import('./pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const CalendarPage         = lazy(() => import('./pages/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const ProfilePage          = lazy(() => import('./pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })))
const SettingsPage         = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const TodoPage             = lazy(() => import('./pages/todos/TodoPage').then(m => ({ default: m.TodoPage })))
const IssuesPage           = lazy(() => import('./pages/issues/IssuesPage').then(m => ({ default: m.IssuesPage })))
const WorkloadDashboard    = lazy(() => import('./pages/workload/WorkloadDashboard').then(m => ({ default: m.WorkloadDashboard })))

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
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner size="lg" /></div>}>
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
            </Suspense>
          </AdminProvider>
        } />

        {/* ── Main App ── */}
        <Route path="/*" element={
          <AppProvider>
            <ChatProvider>
            <Routes>
              <Route path="/"               element={<SignInPage />} />
              <Route path="/signup"         element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/callback"  element={<AuthCallbackPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route path="/app" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index              element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard"   element={<DashboardPage />} />
                <Route path="tasks"       element={<TasksPage />} />
                <Route path="projects/:id" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><ProjectDetailPage /></Suspense>} />
                <Route path="team"        element={<TeamRoute><Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><TeamPage /></Suspense></TeamRoute>} />
                <Route path="analytics"   element={<Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><AnalyticsPage /></Suspense>} />
                <Route path="calendar"    element={<Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><CalendarPage /></Suspense>} />
                <Route path="profile"     element={<Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><ProfilePage /></Suspense>} />
                <Route path="todos"       element={<Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><TodoPage /></Suspense>} />
                <Route path="settings"    element={<DirectorRoute><Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><SettingsPage /></Suspense></DirectorRoute>} />
                <Route path="issues"      element={<IssueRoute><Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><IssuesPage /></Suspense></IssueRoute>} />
                <Route path="workload"   element={<Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>}><WorkloadDashboard /></Suspense>} />
              </Route>

              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
            </ChatProvider>
          </AppProvider>
        } />
      </Routes>
    </BrowserRouter>
  )
}
