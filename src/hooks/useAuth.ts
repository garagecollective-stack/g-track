import { supabase } from '../lib/supabase'
import { getAuthCallbackUrl } from '../lib/authConfig'
import { assertRateLimit, clearRateLimit, recordRateLimitFailure } from '../lib/authRateLimit'

export function useAuth() {
  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const rateLimitKey = `signin:${normalizedEmail}`

    assertRateLimit({ key: rateLimitKey, limit: 5, windowMs: 5 * 60 * 1000 })

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      recordRateLimitFailure({ key: rateLimitKey, windowMs: 5 * 60 * 1000 })
      throw error
    }

    clearRateLimit(rateLimitKey)
  }

  const signUp = async (email: string, password: string, name: string, department: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const rateLimitKey = `signup:${normalizedEmail}`

    assertRateLimit({ key: rateLimitKey, limit: 3, windowMs: 60 * 60 * 1000 })

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: { name, department },
      },
    })
    if (error) {
      recordRateLimitFailure({ key: rateLimitKey, windowMs: 60 * 60 * 1000 })
      throw error
    }

    clearRateLimit(rateLimitKey)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const rateLimitKey = `reset:${normalizedEmail}`

    assertRateLimit({ key: rateLimitKey, limit: 3, windowMs: 60 * 60 * 1000 })

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getAuthCallbackUrl(),
    })

    if (error) {
      recordRateLimitFailure({ key: rateLimitKey, windowMs: 60 * 60 * 1000 })
      throw error
    }

    clearRateLimit(rateLimitKey)
  }

  return { signIn, signUp, signOut, resetPassword }
}
