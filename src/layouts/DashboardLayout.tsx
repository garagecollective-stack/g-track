import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import logoImg from '../assets/logo.png'
import {
  LayoutDashboard, Users, CheckSquare, BarChart2, Calendar,
  Settings, Search, ChevronDown, User, LogOut,
  Home, MoreHorizontal, ListTodo, AlertCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useIssues } from '../hooks/useIssues'
import { Avatar } from '../shared/Avatar'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { NotificationPanel } from '../components/NotificationPanel'
import { GlobalSearch } from '../components/GlobalSearch'
import { Toast } from '../shared/Toast'
import { LoadingSpinner } from '../shared/LoadingSpinner'

const ROLE_BADGE: Record<string, string> = {
  director: 'BOSS',
  teamLead: 'LEAD',
  member:   'EMP',
}

function NavItem({ to, icon: Icon, label, badge }: {
  to: string; icon: React.ElementType; label: string; badge?: number
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-[#0A5540] text-white'
            : 'text-gray-500 hover:bg-[#0A5540]'
        }`
      }
    >
      <Icon size={16} className="text-inherit group-hover:text-white" />
      <span className="group-hover:text-white">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export function DashboardLayout() {
  const { currentUser, authLoading, signOut } = useApp()
  const { issues } = useIssues()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showMoreDrawer, setShowMoreDrawer] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  // Count open issues for badge
  const openIssueCount = issues.filter(i => i.status === 'open').length

  // Ctrl+K / Cmd+K global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!currentUser) return <Navigate to="/" replace />

  const isDirector = currentUser.role === 'director'
  const isMember   = currentUser.role === 'member'

  const navLinks = [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(!isMember ? [{ to: '/app/team', icon: Users, label: 'Team' }] : []),
    { to: '/app/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/app/todos', icon: ListTodo, label: 'To-Do' },
    ...(!isMember ? [{ to: '/app/issues', icon: AlertCircle, label: 'Issues', badge: openIssueCount }] : []),
    { to: '/app/analytics', icon: BarChart2, label: 'Analytics' },
    { to: '/app/calendar', icon: Calendar, label: 'Calendar' },
  ]

  const handleSignOut = async () => {
    signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Desktop Navbar ── */}
      <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-200 hidden md:flex items-center px-6 gap-4">
        {/* Logo */}
        <NavLink to="/app/dashboard" className="flex items-center shrink-0 mr-2">
          <img src={logoImg} alt="G-Track" className="h-8 w-auto" />
        </NavLink>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1">
          {navLinks.map(l => <NavItem key={l.to} {...l} />)}
          {isDirector && <NavItem to="/app/settings" icon={Settings} label="Settings" />}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            className="hidden lg:flex items-center gap-2 text-sm text-gray-400 bg-gray-100 rounded-lg px-3 py-1.5 hover:bg-gray-200 transition-colors"
          >
            <Search size={14} />
            <span className="text-xs">Search...</span>
            <span className="text-[11px] font-medium bg-gray-200 text-gray-500 rounded px-1 py-0.5">⌘K</span>
          </button>

          {/* Notification bell + panel (self-contained) */}
          <NotificationPanel />

          {/* User pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(p => !p)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
            >
              <Avatar name={currentUser.name} size="sm" status={currentUser.user_status} imageUrl={currentUser.avatar_url} />
              <span className="text-sm font-medium text-gray-700 hidden lg:block">{currentUser.name.split(' ')[0]}</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#0A5540]/10 text-[#0A5540]">
                {ROLE_BADGE[currentUser.role]}
              </span>
              <ChevronDown size={13} className="text-gray-400 hidden lg:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
                  <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                  {currentUser.department && (
                    <p className="text-xs text-gray-400 mt-0.5">{currentUser.department}</p>
                  )}
                </div>
                <div className="p-1">
                  <button onClick={() => { navigate('/app/profile'); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <User size={14} className="text-gray-400" /> My Profile
                  </button>
                  <button onClick={() => { navigate('/app/todos'); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <ListTodo size={14} className="text-gray-400" /> My To-Do
                  </button>
                  {isDirector && (
                    <button onClick={() => { navigate('/app/settings'); setShowUserMenu(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                      <Settings size={14} className="text-gray-400" /> Settings
                    </button>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => { setShowUserMenu(false); setShowSignOutConfirm(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden sticky top-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
        <div className="flex items-center">
          <img src={logoImg} alt="G-Track" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowSearch(true)} className="p-2 text-gray-500">
            <Search size={18} />
          </button>
          <NotificationPanel />
          <Avatar name={currentUser.name} size="sm" imageUrl={currentUser.avatar_url} />
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-1">
        {isMember ? (
          // Member: Home, Tasks, Analytics, Calendar
          <>
            {[
              { to: '/app/dashboard', icon: Home,       label: 'Home'     },
              { to: '/app/tasks',     icon: CheckSquare, label: 'Tasks'    },
              { to: '/app/analytics', icon: BarChart2,   label: 'Analytics'},
              { to: '/app/calendar',  icon: Calendar,    label: 'Calendar' },
            ].map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors ${isActive ? 'text-[#0A5540]' : 'text-gray-400'}`
              }>
                <Icon size={21} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            ))}
          </>
        ) : (
          // Director / TeamLead: Home, Tasks, Issues, Analytics, More
          <>
            {[
              { to: '/app/dashboard', icon: Home,        label: 'Home'     },
              { to: '/app/tasks',     icon: CheckSquare,  label: 'Tasks'    },
              { to: '/app/issues',    icon: AlertCircle,  label: 'Issues', badge: openIssueCount },
              { to: '/app/analytics', icon: BarChart2,    label: 'Analytics'},
            ].map(({ to, icon: Icon, label, badge }) => (
              <NavLink key={to} to={to} className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors ${isActive ? 'text-[#0A5540]' : 'text-gray-400'}`
              }>
                <Icon size={21} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-0.5 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => setShowMoreDrawer(true)}
              className="flex flex-col items-center gap-0.5 px-2 py-2 text-gray-400"
            >
              <MoreHorizontal size={21} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </>
        )}
      </nav>

      {/* ── Mobile "More" drawer ── */}
      {showMoreDrawer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:hidden" onClick={() => setShowMoreDrawer(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-1 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            {!isMember && (
              <NavLink to="/app/team" onClick={() => setShowMoreDrawer(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-[#0A5540] text-white' : 'text-gray-700 hover:bg-[#0A5540] hover:text-white'}`}>
                <Users size={18} /> Team
              </NavLink>
            )}
            <NavLink to="/app/todos" onClick={() => setShowMoreDrawer(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-[#0A5540] text-white' : 'text-gray-700 hover:bg-[#0A5540] hover:text-white'}`}>
              <ListTodo size={18} /> My To-Do
            </NavLink>
            <NavLink to="/app/calendar" onClick={() => setShowMoreDrawer(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-[#0A5540] text-white' : 'text-gray-700 hover:bg-[#0A5540] hover:text-white'}`}>
              <Calendar size={18} /> Calendar
            </NavLink>
            <NavLink to="/app/profile" onClick={() => setShowMoreDrawer(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-[#0A5540] text-white' : 'text-gray-700 hover:bg-[#0A5540] hover:text-white'}`}>
              <User size={18} /> My Profile
            </NavLink>
            {isDirector && (
              <NavLink to="/app/settings" onClick={() => setShowMoreDrawer(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-[#0A5540] text-white' : 'text-gray-700 hover:bg-[#0A5540] hover:text-white'}`}>
                <Settings size={18} /> Settings
              </NavLink>
            )}
            <button onClick={() => { setShowSearch(true); setShowMoreDrawer(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
              <Search size={18} /> Search
            </button>
            <div className="border-t border-gray-100 my-1 pt-1">
              <button onClick={() => { setShowMoreDrawer(false); setShowSignOutConfirm(true) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-outside overlay for user menu only */}
      {showUserMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
      )}

      {/* Global Search */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

      {/* Toasts */}
      <Toast />

      {/* Sign Out confirm */}
      <ConfirmDialog
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
        title="Sign Out?"
        message="Are you sure you want to sign out of G-Track?"
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="warning"
      />
    </div>
  )
}
