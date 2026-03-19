-- Add created_by_name column to tasks table
-- This column was referenced in the application code but missing from the schema,
-- causing all task inserts to fail with HTTP 400.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by_name text;

-- Backfill from the joined profiles record where possible
UPDATE tasks t
SET created_by_name = p.name
FROM profiles p
WHERE t.created_by_id = p.id
  AND t.created_by_name IS NULL;

-- Reload PostgREST schema cache so inserts start working immediately
NOTIFY pgrst, 'reload schema';
