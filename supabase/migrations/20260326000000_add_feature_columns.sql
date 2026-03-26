-- Feature 3: Extended todo fields (notes, project link)
ALTER TABLE personal_todos
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS has_issue boolean DEFAULT false;

-- Feature 5: Task revisions
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS revision_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_active_revision boolean DEFAULT false;

-- Feature 10: Task on-hold / blocked
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS blocked_by_description text;

-- Feature 8: Multiple assignees per task
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

-- Enable RLS on task_assignees
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'task_assignees_select') THEN
    CREATE POLICY "task_assignees_select" ON task_assignees FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'task_assignees_insert') THEN
    CREATE POLICY "task_assignees_insert" ON task_assignees FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'task_assignees_delete') THEN
    CREATE POLICY "task_assignees_delete" ON task_assignees FOR DELETE USING (true);
  END IF;
END $$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_todos_project_id ON personal_todos(project_id);
