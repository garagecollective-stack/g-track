import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabaseAdminAuth, db } from '../../lib/supabaseAdmin'
import { assertRateLimit, clearRateLimit, recordRateLimitFailure } from '../../lib/authRateLimit'
import type { Profile } from '../../types'

interface AdminContextType {
  adminUser: Profile | null
  adminLoading: boolean
  signInAdmin: (email: string, password: string) => Promise<void>
  signOutAdmin: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | null>(null)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<Profile | null>(null)
  const [adminLoading, setAdminLoading] = useState(true)

  const fetchAdminProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return data as Profile
  }, [])

  useEffect(() => {
    let handled = false

    supabaseAdminAuth.auth.getSession().then(({ data: { session } }) => {
      if (handled) {
        return
      }

      if (session?.user) {
        fetchAdminProfile(session.user.id)
          .then(profile => {
            setAdminUser(profile?.role === 'super_admin' ? profile : null)
          })
          .finally(() => setAdminLoading(false))
        return
      }

      setAdminLoading(false)
    })

    const { data: { subscription } } = supabaseAdminAuth.auth.onAuthStateChange((_event, session) => {
      handled = true

      if (session?.user) {
        setAdminLoading(true)
        fetchAdminProfile(session.user.id)
          .then(profile => {
            setAdminUser(profile?.role === 'super_admin' ? profile : null)
          })
          .finally(() => setAdminLoading(false))
        return
      }

      setAdminUser(null)
      setAdminLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchAdminProfile])

  const signInAdmin = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const rateLimitKey = `admin-signin:${normalizedEmail}`

    assertRateLimit({ key: rateLimitKey, limit: 5, windowMs: 5 * 60 * 1000 })

    const { data: authData, error: authError } = await supabaseAdminAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (authError) {
      recordRateLimitFailure({ key: rateLimitKey, windowMs: 5 * 60 * 1000 })
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('Authentication returned no user.')
    }

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
      throw new Error(`Access denied. Your role is "${profile.role}" and cannot access this panel.`)
    }

    clearRateLimit(rateLimitKey)
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
