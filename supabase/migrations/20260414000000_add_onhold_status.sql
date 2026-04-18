-- Fix: add 'onHold' to the tasks status check constraint.
-- The original constraint only allowed ('backlog', 'inProgress', 'done'),
-- causing every attempt to set status = 'onHold' to fail with HTTP 400.

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'inProgress', 'done', 'onHold'));
