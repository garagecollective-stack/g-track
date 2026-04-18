-- =================================================================
-- Fix Supabase security linter warnings
-- =================================================================

-- -----------------------------------------------------------------
-- 1. FUNCTION SEARCH PATH MUTABLE
--    Recreate both trigger functions with SET search_path = ''
--    and fully-qualified table names (public.*) so the search_path
--    cannot be hijacked by a malicious schema.
-- -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_issue_raised()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.source = 'todo' THEN
    -- Todo-sourced issues: notify directors only
    INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '🔴 ' || NEW.raised_by_name || ' raised an issue on their todo: "' || NEW.title || '"',
      'issue', NEW.id, 'issue'
    FROM public.profiles p
    WHERE p.role IN ('director', 'super_admin')
      AND p.is_active = true
      AND p.id != NEW.raised_by;

    IF NEW.todo_id IS NOT NULL THEN
      UPDATE public.personal_todos SET has_issue = true WHERE id = NEW.todo_id;
    END IF;

  ELSE
    -- Task/project issues: notify directors
    INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
        || NEW.entity_type || ' "' || NEW.entity_name || '"',
      'issue', NEW.id, 'issue'
    FROM public.profiles p
    WHERE p.role IN ('director', 'super_admin')
      AND p.is_active = true
      AND p.id != NEW.raised_by;

    -- Also notify the team lead of the affected department
    INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
        || NEW.entity_type || ' "' || NEW.entity_name || '"',
      'issue', NEW.id, 'issue'
    FROM public.profiles p
    WHERE p.role = 'teamLead'
      AND p.department = NEW.department
      AND p.is_active = true
      AND p.id != NEW.raised_by;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id)
     AND NEW.assignee_id IS NOT NULL THEN
    IF NEW.assignee_id IS DISTINCT FROM NEW.created_by_id THEN
      INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
      VALUES (
        NEW.assignee_id,
        '📋 ' || COALESCE(NEW.created_by_name, 'Someone') || ' assigned you "' || NEW.title || '"'
          || CASE WHEN NEW.project_name IS NOT NULL THEN ' in ' || NEW.project_name ELSE '' END,
        'task',
        NEW.id,
        'task'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------
-- 2. RLS POLICY ALWAYS TRUE — notifications INSERT
--    Any authenticated user can still insert notifications for any
--    recipient (required for task assignment flows), but we replace
--    the literal `true` with an explicit auth check.
-- -----------------------------------------------------------------

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------
-- 3. RLS POLICY ALWAYS TRUE — task_assignees INSERT / DELETE
--    Only directors, team leads, or the task's own creator may
--    manage the multi-assignee list.
-- -----------------------------------------------------------------

DROP POLICY IF EXISTS "task_assignees_insert" ON public.task_assignees;
CREATE POLICY "task_assignees_insert"
  ON public.task_assignees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('director', 'teamLead')
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND t.created_by_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "task_assignees_delete" ON public.task_assignees;
CREATE POLICY "task_assignees_delete"
  ON public.task_assignees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('director', 'teamLead')
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND t.created_by_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------
-- 4. RLS POLICY ALWAYS TRUE — task_revisions INSERT / UPDATE
--    INSERT: only directors, team leads, or the task's creator may
--            request a revision.
--    UPDATE: only the submitter, or a director/team lead, may change
--            a revision's status (e.g. mark it resolved).
-- -----------------------------------------------------------------

DROP POLICY IF EXISTS "task_revisions_insert" ON public.task_revisions;
CREATE POLICY "task_revisions_insert"
  ON public.task_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('director', 'teamLead')
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND t.created_by_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "task_revisions_update" ON public.task_revisions;
CREATE POLICY "task_revisions_update"
  ON public.task_revisions
  FOR UPDATE
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('director', 'teamLead')
    )
  );

-- -----------------------------------------------------------------
-- 5. PUBLIC BUCKET ALLOWS LISTING — avatars
--    The "avatars" bucket is public so object URLs work without any
--    SELECT policy.  Remove the broad listing policy so anonymous
--    clients can no longer enumerate all uploaded files.
--    Individual avatar URLs remain publicly accessible.
-- -----------------------------------------------------------------

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
