import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../lib/adminApi'
import { db } from '../../lib/supabaseAdmin'
import type { Profile, Role } from '../../types'

export interface AdminUserPayload {
  name:        string
  email:       string
  role:        Role
  department:  string
  manager_ids: string[]
}

interface ProfileManagerRow {
  profile_id: string
  manager_id: string
}

type ProfileUpdatePayload = Partial<Pick<Profile, 'name' | 'role' | 'department' | 'is_active'>> & {
  manager_ids?: string[]
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
      for (const row of managersData as ProfileManagerRow[]) {
        const existing = managersMap.get(row.profile_id) || []
        managersMap.set(row.profile_id, [...existing, row.manager_id])
      }
    }

    const mapped = (data || []).map((u) => ({
      ...u,
      manager_ids: managersMap.get(u.id) || [],
    }))

    setUsers(mapped as Profile[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const createUser = async (payload: AdminUserPayload) => {
    const { user } = await adminApi.createUser({
      name: payload.name,
      email: payload.email,
      role: payload.role,
      department: payload.department || null,
      manager_id: payload.manager_ids[0] ?? null,
    })

    if (payload.manager_ids.length > 0) {
      const { error: managerErr } = await db.from('profile_managers').insert(
        payload.manager_ids.map(mid => ({ profile_id: user.id, manager_id: mid }))
      )
      if (managerErr) console.warn('profile_managers insert skipped:', managerErr.message)
    }

    await fetchUsers()
  }

  const updateUser = async (id: string, updates: ProfileUpdatePayload) => {
    const { manager_ids, ...profileUpdates } = updates

    if (Object.keys(profileUpdates).length > 0) {
      await adminApi.updateUser(id, profileUpdates)
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
    await adminApi.deleteUser(id)
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
    await updateUser(id, { manager_ids })
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
