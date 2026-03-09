-- =================================================================
-- G-TRACK: Create Super Admin User (Standalone Fix)
-- Run this in Supabase → SQL Editor → New Query
--
-- Run this if supabase-superadmin.sql failed or if the super admin
-- user does not appear in the profiles table.
-- =================================================================

-- Step 1: Ensure super_admin is an allowed role value
-- (Drop old constraint, add new one that includes super_admin)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'director', 'teamLead', 'member'));

-- Step 2: Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 3: Create the super admin auth user + profile
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  -- Check if the auth user already exists
  SELECT id INTO admin_uid
  FROM auth.users
  WHERE email = 'superadmin@gtrack.local'
  LIMIT 1;

  IF admin_uid IS NULL THEN
    -- ── Create the auth user ──────────────────────────────────────
    admin_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      confirmation_sent_at,
      is_sso_user,
      deleted_at
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'superadmin@gtrack.local',
      crypt('admin123', gen_salt('bf')),
      now(),                                        -- email already confirmed
      '{"name":"Super Admin"}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      false,
      now(),
      now(),
      now(),
      false,
      null
    );

    -- ── Create the auth identity (required for email/password login) ──
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_uid,
      'superadmin@gtrack.local',
      jsonb_build_object(
        'sub',            admin_uid::text,
        'email',          'superadmin@gtrack.local',
        'email_verified', true,
        'provider',       'email'
      ),
      'email',
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Created auth user with id: %', admin_uid;
  ELSE
    -- ── Auth user exists — reset the password ────────────────────
    UPDATE auth.users
    SET
      encrypted_password  = crypt('admin123', gen_salt('bf')),
      email_confirmed_at  = COALESCE(email_confirmed_at, now()),
      updated_at          = now()
    WHERE id = admin_uid;

    RAISE NOTICE 'Auth user already existed (id: %). Password reset to admin123.', admin_uid;
  END IF;

  -- ── Upsert the profile with super_admin role ──────────────────
  INSERT INTO public.profiles (id, name, email, role, is_active)
  VALUES (admin_uid, 'Super Admin', 'superadmin@gtrack.local', 'super_admin', true)
  ON CONFLICT (id) DO UPDATE
    SET role      = 'super_admin',
        name      = 'Super Admin',
        is_active = true;

  RAISE NOTICE 'Profile upserted with role = super_admin.';
END;
$$;

-- Step 4: Add manager_id + department_head columns if missing
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS department_head uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Step 5: Update the get_my_role() helper to include super_admin
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 6: Verify — should show the super admin row
SELECT id, name, email, role, is_active
FROM profiles
WHERE email = 'superadmin@gtrack.local';
