import { useState, useEffect, useCallback } from 'react'
import { supabaseAdmin, db } from '../../lib/supabaseAdmin'
import type { Profile, Role } from '../../types'

export interface AdminUserPayload {
  name:        string
  email:       string
  password:    string
  role:        Role
  department:  string
  manager_ids: string[]
}

export function useAdminUsers() {
  const [users,   setUsers]   = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchError(null)

    const { data, error } = await db
      .from('profiles')
      .select('*')
      .order('name')

    if (error) {
      console.error('fetchUsers failed:', error.message)
      setFetchError(error.message)
      setLoading(false)
      return
    }

    // Fetch manager relationships — silently ignored if table doesn't exist yet
    const { data: managersData } = await db
      .from('profile_managers')
      .select('profile_id, manager_id')

    const managersMap = new Map<string, string[]>()
    if (managersData) {
      for (const row of managersData as any[]) {
        const existing = managersMap.get(row.profile_id) || []
        managersMap.set(row.profile_id, [...existing, row.manager_id])
      }
    }

    const mapped = (data || []).map((u: any) => ({
      ...u,
      manager_ids: managersMap.get(u.id) || [],
    }))

    setUsers(mapped as Profile[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const createUser = async (payload: AdminUserPayload) => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email:         payload.email,
      password:      payload.password,
      email_confirm: true,
      user_metadata: { name: payload.name, department: payload.department },
    })
    if (error) throw error

    const { error: profileError } = await db
      .from('profiles')
      .upsert({
        id:         data.user.id,
        email:      payload.email,
        name:       payload.name,
        role:       payload.role,
        department: payload.department || null,
        is_active:  true,
      }, { onConflict: 'id' })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      throw new Error(profileError.message)
    }

    if (payload.manager_ids.length > 0) {
      const { error: managerErr } = await db.from('profile_managers').insert(
        payload.manager_ids.map(mid => ({ profile_id: data.user.id, manager_id: mid }))
      )
      if (managerErr) console.warn('profile_managers insert skipped:', managerErr.message)
    }

    await fetchUsers()
  }

  const updateUser = async (id: string, updates: Partial<Profile>) => {
    const { manager_ids, profile_managers: _, ...profileUpdates } = updates as any

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await db.from('profiles').update(profileUpdates).eq('id', id)
      if (error) throw new Error(error.message)
    }

    if (manager_ids !== undefined) {
      await db.from('profile_managers').delete().eq('profile_id', id)
      if (manager_ids.length > 0) {
        await db.from('profile_managers').insert(
          manager_ids.map((mid: string) => ({ profile_id: id, manager_id: mid }))
        )
      }
    }

    await fetchUsers()
  }

  const deleteUser = async (id: string) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error
    await fetchUsers()
  }

  const toggleActive = async (id: string, is_active: boolean) => {
    await updateUser(id, { is_active })
  }

  const changeRole = async (id: string, role: Role) => {
    await updateUser(id, { role })
  }

  const changeDepartment = async (id: string, department: string) => {
    await updateUser(id, { department })
  }

  const changeManagers = async (id: string, manager_ids: string[]) => {
    await updateUser(id, { manager_ids } as any)
  }

  return {
    users,
    loading,
    fetchError,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleActive,
    changeRole,
    changeDepartment,
    changeManagers,
  }
}
