-- Performance indexes for 20+ concurrent users on Supabase Micro plan.
-- Covers filters used by AppContext, useNotifications, and ChatContext.

-- tasks: additional filters not covered by prior migration
CREATE INDEX IF NOT EXISTS idx_tasks_status         ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_id  ON tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date        ON tasks(due_date);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_department  ON projects(department);
CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);

-- notifications: user_id alone + composite (user_id, read) for unread badge queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- chat: room_id alone + composite with created_at for message fetches
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id      ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id  ON chat_room_members(user_id);

-- profiles: department + role filters used in team lead / director queries
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON profiles(role);

-- issues: status filter (department index already exists)
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

-- ── Cleanup stale data ────────────────────────────────────────────────────────
-- Remove expired typing indicators (older than 1 min = abandoned)
DELETE FROM chat_typing WHERE updated_at < now() - interval '1 minute';

-- Prune old notifications (keep 90 days)
DELETE FROM notifications WHERE created_at < now() - interval '90 days';

-- Prune old chat messages (keep 30 days)
DELETE FROM chat_messages WHERE created_at < now() - interval '30 days';

-- NOTE: Run the following MANUALLY in Supabase SQL Editor after this migration
-- (VACUUM cannot run inside a transaction):
--   VACUUM ANALYZE tasks;
--   VACUUM ANALYZE projects;
--   VACUUM ANALYZE notifications;
--   VACUUM ANALYZE chat_messages;
