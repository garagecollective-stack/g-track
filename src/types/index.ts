export type Role = 'super_admin' | 'director' | 'teamLead' | 'member'
export type UserStatus = 'active' | 'away' | 'offline'
export type ProjectStatus = 'backlog' | 'inProgress' | 'completed' | 'onHold'
export type TaskStatus = 'backlog' | 'inProgress' | 'done'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type AuditTargetType = 'user' | 'project' | 'task' | 'department'

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  department: string | null
  department_id: string | null
  avatar_url: string | null
  user_status: UserStatus
  is_active: boolean
  tasks_completed: number
  last_seen: string | null
  manager_id: string | null
  invited_by: string | null
  created_at: string
}

export interface Department {
  id: string
  name: string
  color: string
  icon: string
  department_head: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  key: string
  description: string | null
  department: string
  department_id: string | null
  owner_id: string | null
  status: ProjectStatus
  priority: Priority
  progress: number
  issue_date: string | null
  due_date: string | null
  sop: string | null
  reference_link: string | null
  client: string | null
  is_archived: boolean
  is_overdue?: boolean
  overdue_alerted_at?: string | null
  created_at: string
  owner?: Profile
  members?: Profile[]
  task_counts?: { todo: number; active: number; done: number }
}

export interface Task {
  id: string
  title: string
  description: string | null
  project_id: string | null
  project_name: string | null
  department: string
  priority: Priority
  status: TaskStatus
  assignee_id: string | null
  assignee_name: string | null
  due_date: string | null
  created_by_id: string | null
  created_by_name: string | null
  created_at: string
  is_overdue?: boolean
  overdue_alerted_at?: string | null
  assignee?: Profile
  creator?: { id: string; name: string; avatar_url: string | null }
  project?: Project
}

export interface ProjectFile {
  id: string
  project_id: string
  file_name: string
  file_url: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string | null
  uploaded_at: string
  uploader?: Profile
}

export interface AuditLog {
  id: string
  performed_by: string | null
  action: string
  target_type: AuditTargetType | null
  target_id: string | null
  target_name: string | null
  details: Record<string, unknown> | null
  created_at: string
  performer?: Profile
}

export interface TodoItem {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  status: 'pending' | 'completed'
  created_at: string
  updated_at: string
}

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}

export interface OverdueAlert {
  id: string
  entity_type: 'project' | 'task'
  entity_id: string
  entity_name: string
  department: string | null
  alerted_to: string
  alerted_role: 'director' | 'teamLead'
  is_read: boolean
  is_dismissed: boolean
  due_date: string
  days_overdue: number
  created_at: string
}

export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent'
export type IssueStatus = 'open' | 'in_review' | 'resolved' | 'closed'

export interface Issue {
  id: string
  entity_type: 'task' | 'project'
  entity_id: string
  entity_name: string
  raised_by: string
  raised_by_name: string
  department: string
  title: string
  description: string
  priority: IssuePriority
  status: IssueStatus
  resolved_by: string | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  updated_at: string
}

export interface IssueReply {
  id: string
  issue_id: string
  replied_by: string
  replied_by_name: string
  replied_by_role: string
  message: string
  created_at: string
}
