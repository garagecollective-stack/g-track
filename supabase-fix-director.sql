-- =================================================================
-- G-TRACK: Fix Director (and all role) Login Issues
-- Run this in Supabase → SQL Editor → New Query
-- =================================================================

-- Step 1: Check current profile roles
-- Run this first to see what's in the DB:
SELECT name, email, role, department, is_active
FROM profiles
ORDER BY role, email;

-- Step 2: Fix roles if they were never set (defaulted to 'member')
UPDATE profiles SET role = 'director',  department = 'Company'              WHERE email = 'rajan@garagecollective.io';
UPDATE profiles SET role = 'teamLead',  department = 'Developer'            WHERE email = 'priya@garagecollective.io';
UPDATE profiles SET role = 'teamLead',  department = 'Design'               WHERE email = 'pooja@garagecollective.io';
UPDATE profiles SET role = 'teamLead',  department = 'Social Media'         WHERE email = 'kavita@garagecollective.io';
UPDATE profiles SET role = 'teamLead',  department = 'Business Development' WHERE email = 'arjun@garagecollective.io';
UPDATE profiles SET role = 'teamLead',  department = 'SEO'                  WHERE email = 'shreya@garagecollective.io';
UPDATE profiles SET role = 'member',    department = 'Developer'            WHERE email = 'rohit@garagecollective.io';
UPDATE profiles SET role = 'member',    department = 'Design'               WHERE email = 'anjali@garagecollective.io';
UPDATE profiles SET role = 'member',    department = 'Social Media'         WHERE email = 'suresh@garagecollective.io';
UPDATE profiles SET role = 'member',    department = 'Developer'            WHERE email = 'neha@garagecollective.io';
UPDATE profiles SET role = 'member',    department = 'Business Development' WHERE email = 'vivek@garagecollective.io';
UPDATE profiles SET role = 'member',    department = 'SEO'                  WHERE email = 'divya@garagecollective.io';

-- Step 3: Ensure all profiles are active
UPDATE profiles SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- Step 4: Ensure email_confirmed_at is set on all auth users
-- (Supabase requires email to be confirmed before login works)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- Step 5: Ensure the get_my_role() helper function exists
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 6: Verify profiles read policy exists (required for fetchProfile to work)
-- If this returns 0 rows, the policy is missing — run supabase-setup.sql first.
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 7: Final verification — all 12 users with correct roles
SELECT name, email, role, department
FROM profiles
ORDER BY role, department;
