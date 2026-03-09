import type { Priority, TaskStatus, ProjectStatus } from '../types'
import { DEPT_COLORS } from '../constants'

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function timeAgo(date: string | null | undefined): string {
  if (!date) return ''
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (secs < 60) return 'just now'
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  return formatDate(date)
}

export function getDeptColor(dept: string | null | undefined): string {
  if (!dept) return '#6b7280'
  return DEPT_COLORS[dept] || '#6b7280'
}

export function getPriorityColor(p: Priority): string {
  switch (p) {
    case 'critical': return '#ef4444'
    case 'high': return '#f97316'
    case 'medium': return '#eab308'
    case 'low': return '#9ca3af'
  }
}

export function getStatusColor(s: TaskStatus | ProjectStatus): string {
  switch (s) {
    case 'backlog': return '#6b7280'
    case 'inProgress': return '#3b82f6'
    case 'done': return '#22c55e'
    case 'completed': return '#0A5540'
    case 'onHold': return '#eab308'
  }
}

export function generateProjectKey(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return ''
  const key = words.map(w => w[0]).join('').toUpperCase()
  return key.slice(0, 5)
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  due.setHours(23, 59, 59, 999)
  return due < new Date()
}

export function friendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password'
  if (msg.includes('Email already registered') || msg.includes('already been registered')) return 'An account with this email already exists'
  if (msg.includes('duplicate key value')) return 'A record with this value already exists'
  if (msg.includes('check constraint')) return 'Invalid value provided'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) return 'Connection lost. Please check your internet connection.'
  return 'Something went wrong. Please try again.'
}

export function getFileIcon(fileType: string | null): string {
  if (!fileType) return '📄'
  if (fileType.includes('pdf')) return '📄'
  if (fileType.includes('image')) return '🖼'
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return '📊'
  if (fileType.includes('word') || fileType.includes('document')) return '📝'
  if (fileType.includes('zip') || fileType.includes('archive')) return '📦'
  if (fileType.includes('video')) return '🎬'
  if (fileType.includes('audio')) return '🎵'
  return '📄'
}
