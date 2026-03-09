import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import logoImg from '../../assets/logo.png'
import {
  LayoutDashboard, Users, Building2, GitBranch,
  Settings, LogOut, Menu,
} from 'lucide-react'
import { useAdmin } from '../context/AdminContext'
import { LoadingSpinner } from '../../shared/LoadingSpinner'
import { getInitials } from '../../utils/helpers'

const NAV = [
  { to: '/super-admin/dashboard',    icon: LayoutDashboard, label: 'Overview'    },
  { to: '/super-admin/users',        icon: Users,           label: 'Users'       },
  { to: '/super-admin/departments',  icon: Building2,       label: 'Departments' },
  { to: '/super-admin/hierarchy',    icon: GitBranch,       label: 'Hierarchy'   },
  { to: '/super-admin/settings',     icon: Settings,        label: 'Settings'    },
]

function AdminNavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/super-admin/dashboard'}
    >
      {({ isActive }) => (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
          isActive
            ? 'bg-[#0A5540] text-white shadow-sm'
            : 'text-gray-500 hover:text-white hover:bg-[#0A5540]'
        }`}>
          <Icon size={17} />
          <span>{label}</span>
        </div>
      )}
    </NavLink>
  )
}

export function AdminLayout() {
  const { adminUser, adminLoading, signOutAdmin } = useAdmin()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!adminUser) return <Navigate to="/super-admin/login" replace />

  const handleSignOut = async () => {
    await signOutAdmin()
    navigate('/super-admin/login')
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-gray-200">
        <img src={logoImg} alt="G-Track" className="h-8 w-auto mb-1" />
        <p className="text-[10px] text-gray-500 font-medium">Super Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(n => <AdminNavItem key={n.to} {...n} />)}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#0A5540] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(adminUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{adminUser.name}</p>
            <p className="text-xs text-gray-500 truncate">{adminUser.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-56 bg-white border-r border-gray-200 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="G-Track" className="h-7 w-auto" />
            <span className="text-xs font-semibold text-gray-500">Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
