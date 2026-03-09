import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabaseAdminAuth, supabaseAdmin } from '../../lib/supabaseAdmin'
import type { Profile } from '../../types'

interface AdminContextType {
  adminUser: Profile | null
  adminLoading: boolean
  signInAdmin: (email: string, password: string) => Promise<void>
  signOutAdmin: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | null>(null)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminUser,    setAdminUser]    = useState<Profile | null>(null)
  const [adminLoading, setAdminLoading] = useState(true)

  // Fetch profile via service-role client (bypasses RLS — always readable)
  const fetchAdminProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data as Profile
  }, [])

  // Restore persisted admin session on mount
  useEffect(() => {
    let handled = false

    supabaseAdminAuth.auth.getSession().then(({ data: { session: s } }) => {
      if (handled) return
      if (s?.user) {
        fetchAdminProfile(s.user.id).then(profile => {
          if (profile?.role === 'super_admin') setAdminUser(profile)
          else setAdminUser(null)
        }).finally(() => setAdminLoading(false))
      } else {
        setAdminLoading(false)
      }
    })

    const { data: { subscription } } = supabaseAdminAuth.auth.onAuthStateChange((_event, s) => {
      handled = true
      if (s?.user) {
        setAdminLoading(true)
        fetchAdminProfile(s.user.id).then(profile => {
          if (profile?.role === 'super_admin') setAdminUser(profile)
          else setAdminUser(null)
        }).finally(() => setAdminLoading(false))
      } else {
        setAdminUser(null)
        setAdminLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchAdminProfile])

  const signInAdmin = useCallback(async (email: string, password: string) => {
    // Step 1 — authenticate with anon-key client (correct for signInWithPassword)
    const { data: authData, error: authError } =
      await supabaseAdminAuth.auth.signInWithPassword({ email, password })

    if (authError) {
      // Throw the real Supabase error message so the UI can display it
      throw new Error(authError.message)
    }
    if (!authData.user) throw new Error('Authentication returned no user.')

    // Step 2 — verify super_admin role via service-role data client
    const profile = await fetchAdminProfile(authData.user.id)

    if (!profile) {
      await supabaseAdminAuth.auth.signOut()
      throw new Error(
        'Profile not found for this account.\n' +
        'Run supabase-superadmin.sql in the Supabase SQL Editor to set up the super admin user.'
      )
    }

    if (profile.role !== 'super_admin') {
      await supabaseAdminAuth.auth.signOut()
      throw new Error(
        `Access denied. Your role is "${profile.role}" — only super_admin can access this panel.`
      )
    }

    setAdminUser(profile)
  }, [fetchAdminProfile])

  const signOutAdmin = useCallback(async () => {
    await supabaseAdminAuth.auth.signOut()
    setAdminUser(null)
  }, [])

  return (
    <AdminContext.Provider value={{ adminUser, adminLoading, signInAdmin, signOutAdmin }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}
