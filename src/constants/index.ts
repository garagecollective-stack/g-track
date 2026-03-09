import type { Priority, ProjectStatus, TaskStatus } from '../types'

export const DEPARTMENTS = [
  { name: 'Developer', color: '#6366F1', icon: 'code-2' },
  { name: 'Design', color: '#EC4899', icon: 'palette' },
  { name: 'Social Media', color: '#F97316', icon: 'share-2' },
  { name: 'Business Development', color: '#14B8A6', icon: 'briefcase' },
  { name: 'SEO', color: '#F59E0B', icon: 'search' },
] as const

export const DEPT_COLORS: Record<string, string> = {
  'Developer': '#6366F1',
  'Design': '#EC4899',
  'Social Media': '#F97316',
  'Business Development': '#14B8A6',
  'SEO': '#F59E0B',
  'Company': '#0A5540',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const STATUS_LABELS: Record<ProjectStatus | TaskStatus, string> = {
  backlog: 'Backlog',
  inProgress: 'In Progress',
  completed: 'Completed',
  onHold: 'On Hold',
  done: 'Done',
}

export const ROLE_LABELS = {
  director: 'Director',
  teamLead: 'Team Lead',
  member: 'Member',
} as const

export const COLOR_SWATCHES = [
  '#6366F1',
  '#EC4899',
  '#F97316',
  '#14B8A6',
  '#F59E0B',
  '#0A5540',
]

export const ICON_OPTIONS = [
  'code-2',
  'palette',
  'share-2',
  'briefcase',
  'search',
  'layers',
  'globe',
  'trending-up',
  'users',
  'star',
]

export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
]

export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]
