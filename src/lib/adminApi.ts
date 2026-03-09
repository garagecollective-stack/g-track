/**
 * adminApi — thin client that calls the Supabase Edge Functions for all
 * super-admin write operations (create / update / delete users).
 *
 * Each request is authenticated with the current admin session JWT so the
 * edge function can verify the caller has the super_admin role server-side
 * before touching auth.users or public.profiles.
 *
 * Reads (list users, list depts, etc.) still use the supabaseAdmin client
 * directly — the service_role key is acceptable for read-only queries in an
 * internal tool, and edge functions would add unnecessary latency for those.
 */

import { supabaseAdminAuth } from './supabaseAdmin'

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// ── Token helper ────────────────────────────────────────────────────────────

async function getAdminToken(): Promise<string> {
  const { data: { session } } = await supabaseAdminAuth.auth.getSession()
  if (!session?.access_token) {
    throw new Error('No active admin session. Please sign in again.')
  }
  return session.access_token
}

// ── Generic fetch wrapper ────────────────────────────────────────────────────

async function callFunction<T>(
  functionName: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const token = await getAdminToken()

  const res = await fetch(`${FUNCTIONS_BASE}/${functionName}`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))

  if (!res.ok) {
    throw new Error(data?.error ?? `Request to ${functionName} failed (${res.status})`)
  }

  return data as T
}

// ── Typed API surface ────────────────────────────────────────────────────────

export interface CreateUserPayload {
  name:       string
  email:      string
  password:   string
  role:       string
  department: string | null
  manager_id: string | null
}

export interface UpdateUserPayload {
  name?:       string
  role?:       string
  department?: string | null
  manager_id?: string | null
  is_active?:  boolean
}

export const adminApi = {
  /**
   * POST /api/admin/create-user
   * Creates an auth.users entry + public.profiles row in a single transaction.
   * Rolls back the auth user if profile insertion fails.
   */
  createUser: (payload: CreateUserPayload) =>
    callFunction<{ user: { id: string; email: string; name: string } }>(
      'admin-create-user',
      payload as unknown as Record<string, unknown>,
    ),

  /**
   * POST /api/admin/delete-user
   * Deletes the auth.users row. The ON DELETE CASCADE FK constraint
   * automatically removes the corresponding public.profiles row.
   */
  deleteUser: (userId: string) =>
    callFunction<{ success: boolean; deleted: string }>(
      'admin-delete-user',
      { userId },
    ),

  /**
   * POST /api/admin/update-user
   * Updates whitelisted profile fields. The server validates the caller role
   * and rejects attempts to escalate privileges (e.g. setting role=super_admin).
   */
  updateUser: (userId: string, updates: UpdateUserPayload) =>
    callFunction<{ user: Record<string, unknown> }>(
      'admin-update-user',
      { userId, ...updates as unknown as Record<string, unknown> },
    ),
}
