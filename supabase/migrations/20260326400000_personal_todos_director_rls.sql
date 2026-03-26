-- Allow directors and super_admins to read all personal_todos
-- This is needed for MemberDetailDrawer to show teamLead todos to directors

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'personal_todos' AND policyname = 'personal_todos_director_read'
  ) THEN
    CREATE POLICY "personal_todos_director_read"
      ON personal_todos FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role IN ('director', 'super_admin')
            AND is_active = true
        )
      );
  END IF;
END $$;
