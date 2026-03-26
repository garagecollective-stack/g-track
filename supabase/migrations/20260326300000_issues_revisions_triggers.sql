-- ============================================================
-- FIX 2: Open task_revisions to all authenticated users
-- ============================================================
DROP POLICY IF EXISTS "task_revisions_select" ON task_revisions;
CREATE POLICY "task_revisions_select"
  ON task_revisions FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- FIX 3: Add source + todo_id to issues
-- ============================================================
ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'task'
    CHECK (source IN ('task', 'project', 'todo', 'general'));

ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS todo_id uuid REFERENCES personal_todos(id) ON DELETE SET NULL;

-- ============================================================
-- FIX 3: Updated notify_issue_raised — todo issues → directors only
-- ============================================================
CREATE OR REPLACE FUNCTION notify_issue_raised()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source = 'todo' THEN
    -- Todo-sourced issues: notify directors only
    INSERT INTO notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '🔴 ' || NEW.raised_by_name || ' raised an issue on their todo: "' || NEW.title || '"',
      'issue', NEW.id, 'issue'
    FROM profiles p
    WHERE p.role IN ('director', 'super_admin')
      AND p.is_active = true
      AND p.id != NEW.raised_by;

    -- Update has_issue flag on the todo
    IF NEW.todo_id IS NOT NULL THEN
      UPDATE personal_todos SET has_issue = true WHERE id = NEW.todo_id;
    END IF;

  ELSE
    -- Task/project issues: notify directors
    INSERT INTO notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
        || NEW.entity_type || ' "' || NEW.entity_name || '"',
      'issue', NEW.id, 'issue'
    FROM profiles p
    WHERE p.role IN ('director', 'super_admin')
      AND p.is_active = true
      AND p.id != NEW.raised_by;

    -- Also notify team lead of the department
    INSERT INTO notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
        || NEW.entity_type || ' "' || NEW.entity_name || '"',
      'issue', NEW.id, 'issue'
    FROM profiles p
    WHERE p.role = 'teamLead'
      AND p.department = NEW.department
      AND p.is_active = true
      AND p.id != NEW.raised_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger if not already present
DROP TRIGGER IF EXISTS on_issue_raised ON issues;
CREATE TRIGGER on_issue_raised
  AFTER INSERT ON issues
  FOR EACH ROW EXECUTE PROCEDURE notify_issue_raised();

-- ============================================================
-- FIX 4: notify_task_assigned trigger (DB-level backup)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id)
     AND NEW.assignee_id IS NOT NULL THEN
    -- Don't notify if assigning to yourself
    IF NEW.assignee_id IS DISTINCT FROM NEW.created_by_id THEN
      INSERT INTO notifications (user_id, message, type, related_id, related_type)
      VALUES (
        NEW.assignee_id,
        '📋 ' || COALESCE(NEW.created_by_name, 'Someone') || ' assigned you "' || NEW.title || '"'
          || CASE WHEN NEW.project_name IS NOT NULL THEN ' in ' || NEW.project_name ELSE '' END,
        'task',
        NEW.id,
        'task'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_assigned ON tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE OF assignee_id ON tasks
  FOR EACH ROW EXECUTE PROCEDURE notify_task_assigned();
