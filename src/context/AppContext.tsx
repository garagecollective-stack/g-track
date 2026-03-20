import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, ToastItem, Task, Project } from '../types'
import { requestNotificationPermission } from '../services/pushNotifications'

interface AppContextType {
  currentUser: Profile | null
  session: Session | null
  authLoading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  updateTheme: (theme: 'light' | 'dark') => Promise<void>
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
  // Shared task/project state — consumed by useTasks + useProjects
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  tasksLoading: boolean
  tasksError: string | null
  fetchTasks: () => Promise<void>
  projects: Project[]
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  projectsLoading: boolean
  projectsError: string | null
  fetchProjects: () => Promise<void>
  // Connection status
  isOnline: boolean
}

function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('gtrack-theme', theme)
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // Shared data state
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Apply theme: prefer DB value, fall back to localStorage for fast initial paint
  useEffect(() => {
    const stored = localStorage.getItem('gtrack-theme') as 'light' | 'dark' | null
    if (stored === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  useEffect(() => {
    if (!currentUser) return
    const theme = currentUser.theme ?? 'light'
    applyTheme(theme)
  }, [currentUser])

  // Request browser push notification permission once after login
  useEffect(() => {
    if (currentUser) {
      requestNotificationPermission()
    }
  }, [currentUser])

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setCurrentUser(data as Profile)
  }, [])

  const refreshUser = useCallback(async () => {
    if (session?.user.id) {
      await fetchProfile(session.user.id)
    }
  }, [session, fetchProfile])

  // ── Fetch all tasks visible to the current user ──────────────────────────────

  const fetchTasks = useCallback(async () => {
    if (!currentUser?.id) return
    setTasksLoading(true)
    setTasksError(null)
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select(`
          id, title, description,
          project_id, project_name,
          department, priority, status,
          assignee_id, assignee_name,
          due_date,
          created_by_id, created_by_name, created_by_department,
          created_at, is_overdue, overdue_alerted_at,
          assignee:profiles!tasks_assignee_id_fkey(id, name, email, role, department, user_status),
          creator:profiles!tasks_created_by_id_fkey(id, name, avatar_url, department)
        `)
        .order('created_at', { ascending: false })
        .limit(150)

      if (err) throw err

      const fetched = (data || []).map((task: any) => ({
        ...task,
        assignee: Array.isArray(task.assignee) ? (task.assignee[0] ?? null) : (task.assignee ?? null),
        creator:  Array.isArray(task.creator)  ? (task.creator[0]  ?? null) : (task.creator  ?? null),
      }))

      // Client-side overdue detection: mark tasks overdue without waiting for nightly cron
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const overdueIds = fetched
        .filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done' && !t.is_overdue)
        .map(t => t.id)

      if (overdueIds.length > 0) {
        supabase.from('tasks').update({ is_overdue: true }).in('id', overdueIds).then(() => {})
      }

      setTasks(fetched)
    } catch (e) {
      setTasksError(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally {
      setTasksLoading(false)
    }
  }, [currentUser?.id])

  // ── Fetch all active projects ────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    if (!currentUser?.id) return
    setProjectsLoading(true)
    setProjectsError(null)
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(id, name, email, role, department),
          members:project_members(user:profiles(id, name, email, role, department))
        `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(75)

      if (err) throw err

      const formatted = (data || []).map(p => ({
        ...p,
        members: p.members?.map((m: { user: unknown }) => m.user) || [],
      }))
      setProjects(formatted)
    } catch (e) {
      setProjectsError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setProjectsLoading(false)
    }
  }, [currentUser?.id])

  // Stable refs so the channel callback always calls the latest fetch functions
  const fetchTasksRef = useRef(fetchTasks)
  const fetchProjectsRef = useRef(fetchProjects)
  useEffect(() => { fetchTasksRef.current = fetchTasks }, [fetchTasks])
  useEffect(() => { fetchProjectsRef.current = fetchProjects }, [fetchProjects])

  // ── Combined realtime channel for tasks + projects ───────────────────────────

  useEffect(() => {
    if (!currentUser?.id) return

    fetchTasksRef.current()
    fetchProjectsRef.current()

    const channel = supabase
      .channel(`app-data-${currentUser.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = payload.new as Task
            setTasks(prev => prev.find(x => x.id === t.id) ? prev : [t, ...prev])
          }
          if (payload.eventType === 'UPDATE') {
            const t = payload.new as Task
            setTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x))
          }
          if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(x => x.id !== payload.old.id))
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const p = payload.new as Project
            setProjects(prev => prev.find(x => x.id === p.id) ? prev : [p, ...prev])
          }
          if (payload.eventType === 'UPDATE') {
            const p = payload.new as Project
            setProjects(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x))
          }
          if (payload.eventType === 'DELETE') {
            setProjects(prev => prev.filter(x => x.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsOnline(true)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsOnline(false)
          setTimeout(() => {
            fetchTasksRef.current()
            fetchProjectsRef.current()
          }, 5000)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id])

  // ── Auth ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount, covering the getSession case.
    // We still call getSession as a fast-path to avoid a blank screen flash,
    // but we let onAuthStateChange be the source of truth.
    let profileFetchDone = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      // Only use this if onAuthStateChange hasn't already handled it
      if (!profileFetchDone) {
        setSession(s)
        if (s?.user) {
          fetchProfile(s.user.id).finally(() => setAuthLoading(false))
        } else {
          setAuthLoading(false)
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      profileFetchDone = true
      setSession(s)
      if (s?.user) {
        // Keep authLoading true while we fetch the profile so ProtectedRoute
        // doesn't redirect to "/" before currentUser is populated.
        setAuthLoading(true)
        fetchProfile(s.user.id).finally(() => setAuthLoading(false))
      } else {
        setCurrentUser(null)
        // Clear shared data on sign-out
        setTasks([])
        setProjects([])
        setAuthLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setSession(null)
    setTasks([])
    setProjects([])
    applyTheme('light')
  }, [])

  const updateTheme = useCallback(async (theme: 'light' | 'dark') => {
    applyTheme(theme)
    setCurrentUser(prev => prev ? { ...prev, theme } : prev)
    if (session?.user.id) {
      const { error } = await supabase.from('profiles').update({ theme }).eq('id', session.user.id)
      if (error) throw error
    }
  }, [session])

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36)
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <AppContext.Provider value={{
      currentUser, session, authLoading,
      signOut, refreshUser, updateTheme,
      toasts, addToast, removeToast,
      tasks, setTasks, tasksLoading, tasksError, fetchTasks,
      projects, setProjects, projectsLoading, projectsError, fetchProjects,
      isOnline,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
