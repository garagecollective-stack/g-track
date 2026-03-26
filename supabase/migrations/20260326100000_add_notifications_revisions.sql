-- ============================================================
-- Notifications table (create if missing)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        text,
  message      text NOT NULL,
  type         text NOT NULL DEFAULT 'general',
  read         boolean NOT NULL DEFAULT false,
  related_id   uuid,
  related_type text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_select_own') THEN
    CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_insert') THEN
    CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_update_own') THEN
    CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_delete_own') THEN
    CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- Task revisions table
-- ============================================================
CREATE TABLE IF NOT EXISTS task_revisions (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id           uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  revision_number   integer NOT NULL DEFAULT 1,
  feedback          text NOT NULL,
  submitted_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_by_name text,
  submitted_by_role text,
  status            text NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_revisions_task_id ON task_revisions(task_id);

ALTER TABLE task_revisions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='task_revisions' AND policyname='task_revisions_select') THEN
    CREATE POLICY "task_revisions_select" ON task_revisions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='task_revisions' AND policyname='task_revisions_insert') THEN
    CREATE POLICY "task_revisions_insert" ON task_revisions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='task_revisions' AND policyname='task_revisions_update') THEN
    CREATE POLICY "task_revisions_update" ON task_revisions FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- task_assignees: add assigned_by column
-- ============================================================
ALTER TABLE task_assignees
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
