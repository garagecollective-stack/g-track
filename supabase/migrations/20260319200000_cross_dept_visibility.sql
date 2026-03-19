-- ============================================================
-- Cross-department task/project visibility for Team Leads
-- ============================================================

-- 1. Add created_by_department column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_department text;

-- Backfill existing rows from the creator's profile
UPDATE tasks t
SET created_by_department = p.department
FROM profiles p
WHERE t.created_by_id = p.id AND t.created_by_department IS NULL;

-- 2. Fix tasks_select_lead:
--    Team Lead now sees tasks where department = their dept
--    OR the assignee belongs to their dept (cross-dept assignment)
DROP POLICY IF EXISTS "tasks_select_lead" ON tasks;
CREATE POLICY "tasks_select_lead" ON tasks FOR SELECT TO authenticated
  USING (
    get_my_role() = 'teamLead'
    AND (
      department = get_my_dept()
      OR assignee_id IN (
        SELECT id FROM profiles
        WHERE department = get_my_dept() AND is_active = true
      )
    )
  );

-- 3. Fix proj_select_lead:
--    Team Lead now sees own-dept projects
--    OR projects where any of their dept members is a project_member
DROP POLICY IF EXISTS "proj_select_lead" ON projects;
CREATE POLICY "proj_select_lead" ON projects FOR SELECT TO authenticated
  USING (
    get_my_role() = 'teamLead'
    AND (
      department = get_my_dept()
      OR id IN (
        SELECT pm.project_id
        FROM project_members pm
        INNER JOIN profiles p ON pm.user_id = p.id
        WHERE p.department = get_my_dept() AND p.is_active = true
      )
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
