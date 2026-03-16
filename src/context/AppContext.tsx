import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, ToastItem } from '../types'
import { requestNotificationPermission } from '../services/pushNotifications'

interface AppContextType {
  currentUser: Profile | null
  session: Session | null
  authLoading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // Always force light mode — remove dark class if previously stored
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('gtrack-theme')
  }, [])

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
        setAuthLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setSession(null)
  }, [])

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
      signOut, refreshUser,
      toasts, addToast, removeToast,
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
