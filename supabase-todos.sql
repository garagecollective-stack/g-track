-- =====================================================
-- Personal To-Do List — run in Supabase SQL Editor
-- =====================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS personal_todos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  due_date    date,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Index for per-user queries
CREATE INDEX IF NOT EXISTS personal_todos_user_id_idx ON personal_todos(user_id);

-- 3. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_personal_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_personal_todos_updated_at ON personal_todos;
CREATE TRIGGER set_personal_todos_updated_at
  BEFORE UPDATE ON personal_todos
  FOR EACH ROW EXECUTE FUNCTION update_personal_todos_updated_at();

-- 4. Row Level Security
ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own todos"   ON personal_todos;
DROP POLICY IF EXISTS "Users create own todos" ON personal_todos;
DROP POLICY IF EXISTS "Users update own todos" ON personal_todos;
DROP POLICY IF EXISTS "Users delete own todos" ON personal_todos;

CREATE POLICY "Users see own todos"
  ON personal_todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own todos"
  ON personal_todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own todos"
  ON personal_todos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own todos"
  ON personal_todos FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Fix Director login — ensure profiles table has role column populated
--    Run this if the director profile is missing the role='director' value:
-- UPDATE profiles SET role = 'director' WHERE email = 'rajan@garagecollective.io';

-- 6. Verify setup
SELECT 'personal_todos table created successfully' AS status;
SELECT COUNT(*) AS total_policies
  FROM pg_policies
  WHERE tablename = 'personal_todos';
