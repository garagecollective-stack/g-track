-- =================================================================
-- G-TRACK: Super Admin Panel Setup
-- Run this in Supabase → SQL Editor → New Query
-- =================================================================

-- =================================================================
-- STEP 1: Schema changes
-- =================================================================

-- Extend the role constraint to include super_admin
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'director', 'teamLead', 'member'));

-- Add manager_id for hierarchy support
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Add department_head to departments
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS department_head uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Ensure personal_todos table exists (from supabase-todos.sql)
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

-- Enable RLS on todos if not already enabled
ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'personal_todos' AND policyname = 'todos_own'
  ) THEN
    CREATE POLICY "todos_own" ON personal_todos
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- =================================================================
-- STEP 2: Update helper function to include super_admin
-- =================================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =================================================================
-- STEP 3: RLS policies — allow super_admin to access everything
-- =================================================================

-- PROFILES: super_admin can update any profile
DROP POLICY IF EXISTS "profiles_update_super_admin" ON profiles;
CREATE POLICY "profiles_update_super_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin');

-- PROFILES: super_admin can insert profiles
DROP POLICY IF EXISTS "profiles_insert_super_admin" ON profiles;
CREATE POLICY "profiles_insert_super_admin"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

-- PROFILES: super_admin can delete profiles
DROP POLICY IF EXISTS "profiles_delete_super_admin" ON profiles;
CREATE POLICY "profiles_delete_super_admin"
  ON profiles FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- DEPARTMENTS: super_admin can do everything
DROP POLICY IF EXISTS "dept_write_super_admin" ON departments;
CREATE POLICY "dept_write_super_admin"
  ON departments FOR ALL TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

-- PROJECTS: super_admin can read all
DROP POLICY IF EXISTS "proj_select_super_admin" ON projects;
CREATE POLICY "proj_select_super_admin"
  ON projects FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

-- PROJECTS: super_admin can write all
DROP POLICY IF EXISTS "proj_write_super_admin" ON projects;
CREATE POLICY "proj_write_super_admin"
  ON projects FOR ALL TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

-- TASKS: super_admin can read all
DROP POLICY IF EXISTS "tasks_select_super_admin" ON tasks;
CREATE POLICY "tasks_select_super_admin"
  ON tasks FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

-- TASKS: super_admin can write all
DROP POLICY IF EXISTS "tasks_write_super_admin" ON tasks;
CREATE POLICY "tasks_write_super_admin"
  ON tasks FOR ALL TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

-- AUDIT LOGS: super_admin can read all
DROP POLICY IF EXISTS "audit_read_super_admin" ON audit_logs;
CREATE POLICY "audit_read_super_admin"
  ON audit_logs FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

-- PERSONAL_TODOS: super_admin can read all (for oversight)
DROP POLICY IF EXISTS "todos_super_admin" ON personal_todos;
CREATE POLICY "todos_super_admin"
  ON personal_todos FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

-- =================================================================
-- STEP 4: Create the Super Admin user
-- Run AFTER creating the auth user manually in Supabase Auth UI
-- OR via the DO block below
-- =================================================================

-- Auto-create method (requires pgcrypto):
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_uid uuid;
BEGIN
  -- Only create if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@gtrack.local') THEN
    admin_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      is_super_admin, created_at, updated_at
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'superadmin@gtrack.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"name": "Super Admin"}',
      '{"provider":"email","providers":["email"]}',
      false, now(), now()
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), admin_uid, 'superadmin@gtrack.local',
      jsonb_build_object('sub', admin_uid::text, 'email', 'superadmin@gtrack.local', 'email_verified', true),
      'email', now(), now(), now()
    );

    INSERT INTO public.profiles (id, name, email, role)
    VALUES (admin_uid, 'Super Admin', 'superadmin@gtrack.local', 'super_admin')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Super Admin user created with ID: %', admin_uid;
  ELSE
    -- User already exists — ensure profile has super_admin role
    UPDATE public.profiles
    SET role = 'super_admin', name = 'Super Admin'
    WHERE email = 'superadmin@gtrack.local';

    RAISE NOTICE 'Super Admin user already exists — role updated.';
  END IF;
END;
$$;

-- =================================================================
-- STEP 5: Verify
-- =================================================================

SELECT id, name, email, role, department, is_active
FROM profiles
WHERE role = 'super_admin';
