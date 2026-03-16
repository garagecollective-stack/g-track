-- =================================================================
-- G-TRACK: profile_managers — Multi-manager (Reporting To) support
-- Run this in Supabase → SQL Editor → New Query
-- =================================================================

-- Junction table: a user can report to multiple managers (directors)
CREATE TABLE IF NOT EXISTS profile_managers (
  profile_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, manager_id)
);

ALTER TABLE profile_managers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed to show manager names in UI)
DROP POLICY IF EXISTS "pm_read" ON profile_managers;
CREATE POLICY "pm_read"
  ON profile_managers FOR SELECT TO authenticated USING (true);

-- Super admin can manage all
DROP POLICY IF EXISTS "pm_super_admin" ON profile_managers;
CREATE POLICY "pm_super_admin"
  ON profile_managers FOR ALL TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

-- Directors can manage records where they are the manager
DROP POLICY IF EXISTS "pm_director" ON profile_managers;
CREATE POLICY "pm_director"
  ON profile_managers FOR ALL TO authenticated
  USING (manager_id = auth.uid() AND get_my_role() = 'director')
  WITH CHECK (manager_id = auth.uid() AND get_my_role() = 'director');

-- Reload PostgREST schema cache so the join works immediately
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT COUNT(*) AS profile_managers_rows FROM profile_managers;
