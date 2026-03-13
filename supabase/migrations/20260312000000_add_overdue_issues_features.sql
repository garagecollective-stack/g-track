-- ============================================================
-- G-Track Feature Migration
-- Features: Overdue Alert System + Member Lockdown + Issues
-- Run in Supabase SQL Editor in one go (top to bottom)
-- ============================================================


-- ============================================================
-- BLOCK 1 — OVERDUE ALERT SYSTEM
-- ============================================================

-- Add overdue tracking columns to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_overdue boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS overdue_alerted_at timestamptz,
  ADD COLUMN IF NOT EXISTS overdue_alert_dismissed boolean DEFAULT false;

-- Add overdue tracking columns to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_overdue boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS overdue_alerted_at timestamptz;

-- Overdue alerts table
CREATE TABLE IF NOT EXISTS overdue_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text CHECK (entity_type IN ('project', 'task')) NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  department text,
  alerted_to uuid REFERENCES profiles(id) ON DELETE CASCADE,
  alerted_role text CHECK (alerted_role IN ('director', 'teamLead')),
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  due_date date NOT NULL,
  days_overdue int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE overdue_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overdue_alerts_own"
  ON overdue_alerts FOR ALL TO authenticated
  USING (alerted_to = auth.uid());

-- Function: detect and mark overdue projects + tasks, create alerts + notifications
CREATE OR REPLACE FUNCTION check_and_mark_overdue()
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN

  -- ── OVERDUE PROJECTS ────────────────────────────────────────
  FOR rec IN
    SELECT id, name, department, due_date
    FROM projects
    WHERE due_date < CURRENT_DATE
      AND status NOT IN ('completed')
      AND is_archived = false
      AND (is_overdue = false OR is_overdue IS NULL)
  LOOP
    UPDATE projects
      SET is_overdue = true, overdue_alerted_at = now()
    WHERE id = rec.id;

    -- Alert directors
    INSERT INTO overdue_alerts
      (entity_type, entity_id, entity_name, department, alerted_to, alerted_role, due_date, days_overdue)
    SELECT 'project', rec.id, rec.name, rec.department, p.id, 'director',
           rec.due_date, (CURRENT_DATE - rec.due_date)::int
    FROM profiles p
    WHERE p.role = 'director' AND p.is_active = true;

    -- Alert team lead of that department
    INSERT INTO overdue_alerts
      (entity_type, entity_id, entity_name, department, alerted_to, alerted_role, due_date, days_overdue)
    SELECT 'project', rec.id, rec.name, rec.department, p.id, 'teamLead',
           rec.due_date, (CURRENT_DATE - rec.due_date)::int
    FROM profiles p
    WHERE p.role = 'teamLead' AND p.department = rec.department AND p.is_active = true;

    -- Notification bell
    INSERT INTO notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '⚠️ Project "' || rec.name || '" is overdue by '
        || (CURRENT_DATE - rec.due_date)::int || ' day(s). Due: ' || rec.due_date,
      'update', rec.id, 'project'
    FROM profiles p
    WHERE (p.role = 'director'
        OR (p.role = 'teamLead' AND p.department = rec.department))
      AND p.is_active = true;
  END LOOP;

  -- ── OVERDUE TASKS ────────────────────────────────────────────
  FOR rec IN
    SELECT id, title, department, due_date, assignee_id
    FROM tasks
    WHERE due_date < CURRENT_DATE
      AND status != 'done'
      AND (is_overdue = false OR is_overdue IS NULL)
  LOOP
    UPDATE tasks
      SET is_overdue = true, overdue_alerted_at = now()
    WHERE id = rec.id;

    -- Alert directors + department team lead
    INSERT INTO overdue_alerts
      (entity_type, entity_id, entity_name, department, alerted_to, alerted_role, due_date, days_overdue)
    SELECT 'task', rec.id, rec.title, rec.department, p.id, p.role,
           rec.due_date, (CURRENT_DATE - rec.due_date)::int
    FROM profiles p
    WHERE (p.role = 'director'
        OR (p.role = 'teamLead' AND p.department = rec.department))
      AND p.is_active = true;

    -- Notification bell
    INSERT INTO notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '⚠️ Task "' || rec.title || '" is overdue by '
        || (CURRENT_DATE - rec.due_date)::int || ' day(s).',
      'update', rec.id, 'task'
    FROM profiles p
    WHERE (p.role = 'director'
        OR (p.role = 'teamLead' AND p.department = rec.department))
      AND p.is_active = true;
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- BLOCK 2 — MEMBER PERMISSION LOCKDOWN (RLS)
-- NOTE: If your existing policies use a different helper than
--       get_my_role() / get_my_dept(), adjust accordingly.
-- ============================================================

-- Tasks: members can only update status on their own tasks
DROP POLICY IF EXISTS "tasks_update_member" ON tasks;
DROP POLICY IF EXISTS "tasks_update_member_status_only" ON tasks;

CREATE POLICY "tasks_update_member_status_only"
  ON tasks FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'member'
    AND assignee_id = auth.uid()
  )
  WITH CHECK (
    get_my_role() = 'member'
    AND assignee_id = auth.uid()
    AND status IN ('backlog', 'inProgress', 'done')
  );

-- Tasks: only directors and team leads can INSERT
DROP POLICY IF EXISTS "tasks_insert_lead_dir" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_lead_dir_only" ON tasks;

CREATE POLICY "tasks_insert_lead_dir_only"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('director', 'teamLead'));

-- Tasks: only directors and team leads can DELETE
DROP POLICY IF EXISTS "tasks_delete_lead_dir" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_lead_dir_only" ON tasks;

CREATE POLICY "tasks_delete_lead_dir_only"
  ON tasks FOR DELETE TO authenticated
  USING (get_my_role() IN ('director', 'teamLead'));

-- Projects: only directors and department team leads can UPDATE
DROP POLICY IF EXISTS "proj_update_lead" ON projects;
DROP POLICY IF EXISTS "proj_update_lead_dir_only" ON projects;

CREATE POLICY "proj_update_lead_dir_only"
  ON projects FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'director'
    OR (get_my_role() = 'teamLead' AND department = get_my_dept())
  );


-- ============================================================
-- BLOCK 3 — ISSUE / QUERY RAISE SYSTEM
-- ============================================================

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text CHECK (entity_type IN ('task', 'project')) NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  raised_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  raised_by_name text NOT NULL,
  department text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status text CHECK (status IN ('open', 'in_review', 'resolved', 'closed')) DEFAULT 'open',
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Issue replies table
CREATE TABLE IF NOT EXISTS issue_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  replied_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  replied_by_name text NOT NULL,
  replied_by_role text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: issues
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issues_select"
  ON issues FOR SELECT TO authenticated
  USING (
    raised_by = auth.uid()
    OR get_my_role() IN ('director', 'teamLead')
  );

CREATE POLICY "issues_insert_own"
  ON issues FOR INSERT TO authenticated
  WITH CHECK (raised_by = auth.uid());

CREATE POLICY "issues_update_lead_dir"
  ON issues FOR UPDATE TO authenticated
  USING (get_my_role() IN ('director', 'teamLead'));

-- RLS: issue_replies
ALTER TABLE issue_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "replies_select"
  ON issue_replies FOR SELECT TO authenticated
  USING (
    issue_id IN (
      SELECT id FROM issues
      WHERE raised_by = auth.uid()
        OR get_my_role() IN ('director', 'teamLead')
    )
  );

CREATE POLICY "replies_insert"
  ON issue_replies FOR INSERT TO authenticated
  WITH CHECK (replied_by = auth.uid());

-- Trigger: update issues.updated_at when a reply is posted
CREATE OR REPLACE FUNCTION update_issue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE issues SET updated_at = now() WHERE id = NEW.issue_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_issue_reply
  AFTER INSERT ON issue_replies
  FOR EACH ROW EXECUTE PROCEDURE update_issue_timestamp();

-- Trigger: notify directors + team lead when an issue is raised
CREATE OR REPLACE FUNCTION notify_issue_raised()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify directors
  INSERT INTO notifications (user_id, message, type, related_id, related_type)
  SELECT p.id,
    '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
      || NEW.entity_type || ' "' || NEW.entity_name || '"',
    'update', NEW.id, 'issue'
  FROM profiles p
  WHERE p.role = 'director' AND p.is_active = true AND p.id != NEW.raised_by;

  -- Notify team lead of that department
  INSERT INTO notifications (user_id, message, type, related_id, related_type)
  SELECT p.id,
    '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
      || NEW.entity_type || ' "' || NEW.entity_name || '"',
    'update', NEW.id, 'issue'
  FROM profiles p
  WHERE p.role = 'teamLead' AND p.department = NEW.department AND p.is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_issue_created
  AFTER INSERT ON issues
  FOR EACH ROW EXECUTE PROCEDURE notify_issue_raised();

-- Trigger: notify member when a reply is posted on their issue
CREATE OR REPLACE FUNCTION notify_issue_reply()
RETURNS TRIGGER AS $$
DECLARE
  issue_rec RECORD;
BEGIN
  SELECT * INTO issue_rec FROM issues WHERE id = NEW.issue_id;
  INSERT INTO notifications (user_id, message, type, related_id, related_type)
  VALUES (
    issue_rec.raised_by,
    '💬 ' || NEW.replied_by_name || ' replied to your issue: "' || issue_rec.title || '"',
    'update', NEW.issue_id, 'issue'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_reply_created
  AFTER INSERT ON issue_replies
  FOR EACH ROW EXECUTE PROCEDURE notify_issue_reply();

-- Trigger: notify member when their issue is resolved
CREATE OR REPLACE FUNCTION notify_issue_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    INSERT INTO notifications (user_id, message, type, related_id, related_type)
    VALUES (
      OLD.raised_by,
      '✅ Your issue "' || NEW.title || '" has been resolved. Note: '
        || coalesce(NEW.resolution_note, 'No note provided.'),
      'completion', NEW.id, 'issue'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_issue_resolved
  AFTER UPDATE ON issues
  FOR EACH ROW EXECUTE PROCEDURE notify_issue_resolved();
