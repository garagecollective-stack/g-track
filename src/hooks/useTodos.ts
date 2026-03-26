import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { TodoItem } from '../types'
import { useApp } from '../context/AppContext'

export function useTodos() {
  const { currentUser } = useApp()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    const { data, error } = await supabase
      .from('personal_todos')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
    if (!error) setTodos(data || [])
    setLoading(false)
  }, [currentUser])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const createTodo = async (values: { title: string; description?: string; due_date?: string; notes?: string; project_id?: string; project_name?: string }) => {
    if (!currentUser) return
    let result = await supabase
      .from('personal_todos')
      .insert({ ...values, user_id: currentUser.id, status: 'pending' })
      .select()
      .single()

    // If extended columns (notes, project_id, project_name) don't exist in the DB yet, retry with base fields only
    if (result.error) {
      result = await supabase
        .from('personal_todos')
        .insert({ title: values.title, description: values.description, due_date: values.due_date, user_id: currentUser.id, status: 'pending' })
        .select()
        .single()
    }

    if (result.error) throw result.error
    setTodos(prev => [result.data, ...prev])
    return result.data
  }

  const updateTodo = async (id: string, updates: Partial<Pick<TodoItem, 'title' | 'description' | 'due_date' | 'status' | 'notes' | 'project_id' | 'project_name'>>) => {
    let result = await supabase.from('personal_todos').update(updates).eq('id', id)

    // If extended columns don't exist, retry with only base fields
    if (result.error) {
      const { notes: _n, project_id: _p, project_name: _pn, ...baseUpdates } = updates
      result = await supabase.from('personal_todos').update(baseUpdates).eq('id', id)
    }

    if (result.error) throw result.error
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const toggleTodo = async (id: string, current: 'pending' | 'completed') => {
    const next = current === 'pending' ? 'completed' : 'pending'
    await updateTodo(id, { status: next })
  }

  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from('personal_todos').delete().eq('id', id)
    if (error) throw error
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const pending = todos.filter(t => t.status === 'pending').length
  const completed = todos.filter(t => t.status === 'completed').length

  return { todos, loading, fetchTodos, createTodo, updateTodo, toggleTodo, deleteTodo, pending, completed }
}
