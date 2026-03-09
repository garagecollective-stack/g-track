-- ============================================================
-- supabase-cascade-fk.sql
--
-- Adds ON DELETE CASCADE to the profiles → auth.users foreign key.
-- This ensures that when admin-delete-user calls
-- supabase.auth.admin.deleteUser(), the corresponding
-- public.profiles row is automatically removed — no separate
-- DELETE on profiles is required.
--
-- Run once in the Supabase SQL Editor.
-- ============================================================

-- 1. Drop the existing FK (default name used by Supabase migrations)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Re-add with ON DELETE CASCADE
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 3. Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Verify
SELECT
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY';
-- Expected: profiles_id_fkey | CASCADE
