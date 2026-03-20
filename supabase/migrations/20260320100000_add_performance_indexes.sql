-- Performance indexes to prevent statement timeouts and connection pool exhaustion.
-- These cover the exact filters and ORDER BY clauses used by the app's hooks.

-- issues: role-based visibility filters + ORDER BY updated_at
CREATE INDEX IF NOT EXISTS idx_issues_raised_by  ON issues(raised_by);
CREATE INDEX IF NOT EXISTS idx_issues_department ON issues(department);
CREATE INDEX IF NOT EXISTS idx_issues_updated_at ON issues(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_entity_id  ON issues(entity_id);

-- tasks: assignee/department filters + ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department  ON tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at  ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id  ON tasks(project_id);

-- notifications: composite covers user_id filter AND created_at ORDER BY in one scan
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- overdue_alerts: partial index — only non-dismissed rows are ever queried
CREATE INDEX IF NOT EXISTS idx_overdue_alerts_alerted_dismissed
  ON overdue_alerts(alerted_to, is_dismissed)
  WHERE is_dismissed = false;

-- personal_todos: per-user fetch ordered by created_at
CREATE INDEX IF NOT EXISTS idx_personal_todos_user_created
  ON personal_todos(user_id, created_at DESC);
