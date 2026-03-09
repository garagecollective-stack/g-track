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
    const { data } = await supabase
      .from('personal_todos')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
    setTodos(data || [])
    setLoading(false)
  }, [currentUser])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const createTodo = async (values: { title: string; description?: string; due_date?: string }) => {
    if (!currentUser) return
    const { data, error } = await supabase
      .from('personal_todos')
      .insert({ ...values, user_id: currentUser.id, status: 'pending' })
      .select()
      .single()
    if (error) throw error
    setTodos(prev => [data, ...prev])
    return data
  }

  const updateTodo = async (id: string, updates: Partial<Pick<TodoItem, 'title' | 'description' | 'due_date' | 'status'>>) => {
    const { error } = await supabase.from('personal_todos').update(updates).eq('id', id)
    if (error) throw error
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
