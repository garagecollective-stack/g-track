-- =================================================================
-- G-TRACK: Clean Up Broken Super Admin User
-- Run this FIRST if you get "Database error querying schema" on login.
--
-- Direct INSERT into auth.users (our earlier approach) leaves the user
-- in an invalid state that GoTrue cannot process during sign-in.
-- This script removes that broken record so the setup page can
-- recreate the user correctly via GoTrue's own admin API.
-- =================================================================

-- Step 1: Fix the role constraint so super_admin is a valid value
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'director', 'teamLead', 'member'));

-- Step 2: Add missing columns if not present
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS department_head uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Step 3: Remove the broken manually-inserted auth user (if it exists)
DO $$
DECLARE
  broken_uid uuid;
BEGIN
  SELECT id INTO broken_uid
  FROM auth.users
  WHERE email = 'superadmin@gtrack.local'
  LIMIT 1;

  IF broken_uid IS NOT NULL THEN
    -- Remove identity first (FK constraint)
    DELETE FROM auth.identities WHERE user_id = broken_uid;

    -- Remove any sessions/refresh tokens
    DELETE FROM auth.sessions      WHERE user_id = broken_uid;
    DELETE FROM auth.refresh_tokens WHERE user_id = broken_uid::text;

    -- Remove the profile (FK will block auth.users delete otherwise)
    DELETE FROM public.profiles WHERE id = broken_uid;

    -- Remove the auth user
    DELETE FROM auth.users WHERE id = broken_uid;

    RAISE NOTICE 'Removed broken auth user (id: %).', broken_uid;
  ELSE
    RAISE NOTICE 'No existing superadmin@gtrack.local found — nothing to clean up.';
  END IF;
END;
$$;

-- Step 4: Reload PostgREST schema cache
-- (Required after any ALTER TABLE to avoid "Database error querying schema")
NOTIFY pgrst, 'reload schema';

-- Step 5: Update the get_my_role() helper
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 6: Verify the user is gone
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'Clean — no superadmin@gtrack.local in auth.users'
    ELSE 'WARNING: user still present'
  END AS status
FROM auth.users
WHERE email = 'superadmin@gtrack.local';
