-- Drop the old notifications type CHECK constraint and replace with one that
-- covers all types used by the app: task, project, issue, update, completion, overdue, general.

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('task', 'project', 'issue', 'update', 'completion', 'overdue', 'general'));
