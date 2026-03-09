import { useState, useEffect, useCallback } from 'react'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import type { Profile, Role } from '../../types'

export interface AdminUserPayload {
  name:       string
  email:      string
  password:   string
  role:       Role
  department: string
  manager_id: string | null
}

export function useAdminUsers() {
  const [users,   setUsers]   = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('name')
    setUsers((data as Profile[]) ?? [])
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

    // The on_auth_user_created trigger already inserted a basic profile row.
    // Update it with the fields the trigger doesn't set (role, manager_id, is_active).
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        name:       payload.name,
        role:       payload.role,
        department: payload.department || null,
        manager_id: payload.manager_id || null,
        is_active:  true,
      })
      .eq('id', data.user.id)

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      throw new Error(profileError.message)
    }

    await fetchUsers()
  }

  const updateUser = async (id: string, updates: Partial<Profile>) => {
    const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', id)
    if (error) throw new Error(error.message)
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

  const changeManager = async (id: string, manager_id: string | null) => {
    await updateUser(id, { manager_id })
  }

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleActive,
    changeRole,
    changeDepartment,
    changeManager,
  }
}
