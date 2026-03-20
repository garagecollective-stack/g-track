-- ============================================================
-- Security: Fix mutable search_path on all public functions
-- and tighten over-permissive RLS on audit_logs INSERT.
-- Addresses Supabase linter warnings:
--   - function_search_path_mutable (10 functions)
--   - rls_policy_always_true (audit_logs audit_insert)
-- ============================================================


-- ── Helper functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_dept()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT department FROM public.profiles WHERE id = auth.uid();
$$;


-- ── Auth trigger ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
END;
$$;


-- ── Project progress trigger ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_project_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total      int;
  done_count int;
  proj_id    uuid;
BEGIN
  proj_id := COALESCE(NEW.project_id, OLD.project_id);
  SELECT COUNT(*) INTO total      FROM public.tasks WHERE project_id = proj_id;
  SELECT COUNT(*) INTO done_count FROM public.tasks WHERE project_id = proj_id AND status = 'done';
  IF total > 0 THEN
    UPDATE public.projects
    SET progress = ROUND((done_count::numeric / total::numeric) * 100)
    WHERE id = proj_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ── Personal todos updated_at trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_personal_todos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ── Overdue detection ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_and_mark_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec RECORD;
BEGIN

  -- ── OVERDUE PROJECTS ────────────────────────────────────────
  FOR rec IN
    SELECT id, name, department, due_date
    FROM public.projects
    WHERE due_date < CURRENT_DATE
      AND status NOT IN ('completed')
      AND is_archived = false
      AND (is_overdue = false OR is_overdue IS NULL)
  LOOP
    UPDATE public.projects
      SET is_overdue = true, overdue_alerted_at = now()
    WHERE id = rec.id;

    INSERT INTO public.overdue_alerts
      (entity_type, entity_id, entity_name, department, alerted_to, alerted_role, due_date, days_overdue)
    SELECT 'project', rec.id, rec.name, rec.department, p.id, 'director',
           rec.due_date, (CURRENT_DATE - rec.due_date)::int
    FROM public.profiles p
    WHERE p.role = 'director' AND p.is_active = true;

    INSERT INTO public.overdue_alerts
      (entity_type, entity_id, entity_name, department, alerted_to, alerted_role, due_date, days_overdue)
    SELECT 'project', rec.id, rec.name, rec.department, p.id, 'teamLead',
           rec.due_date, (CURRENT_DATE - rec.due_date)::int
    FROM public.profiles p
    WHERE p.role = 'teamLead' AND p.department = rec.department AND p.is_active = true;

    INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '⚠️ Project "' || rec.name || '" is overdue by '
        || (CURRENT_DATE - rec.due_date)::int || ' day(s). Due: ' || rec.due_date,
      'update', rec.id, 'project'
    FROM public.profiles p
    WHERE (p.role = 'director'
        OR (p.role = 'teamLead' AND p.department = rec.department))
      AND p.is_active = true;
  END LOOP;

  -- ── OVERDUE TASKS ────────────────────────────────────────────
  FOR rec IN
    SELECT id, title, department, due_date, assignee_id
    FROM public.tasks
    WHERE due_date < CURRENT_DATE
      AND status != 'done'
      AND (is_overdue = false OR is_overdue IS NULL)
  LOOP
    UPDATE public.tasks
      SET is_overdue = true, overdue_alerted_at = now()
    WHERE id = rec.id;

    INSERT INTO public.overdue_alerts
      (entity_type, entity_id, entity_name, department, alerted_to, alerted_role, due_date, days_overdue)
    SELECT 'task', rec.id, rec.title, rec.department, p.id, p.role,
           rec.due_date, (CURRENT_DATE - rec.due_date)::int
    FROM public.profiles p
    WHERE (p.role = 'director'
        OR (p.role = 'teamLead' AND p.department = rec.department))
      AND p.is_active = true;

    INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
    SELECT p.id,
      '⚠️ Task "' || rec.title || '" is overdue by '
        || (CURRENT_DATE - rec.due_date)::int || ' day(s).',
      'update', rec.id, 'task'
    FROM public.profiles p
    WHERE (p.role = 'director'
        OR (p.role = 'teamLead' AND p.department = rec.department))
      AND p.is_active = true;
  END LOOP;

END;
$$;


-- ── Issue triggers ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_issue_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.issues SET updated_at = now() WHERE id = NEW.issue_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_issue_raised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
  SELECT p.id,
    '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
      || NEW.entity_type || ' "' || NEW.entity_name || '"',
    'update', NEW.id, 'issue'
  FROM public.profiles p
  WHERE p.role = 'director' AND p.is_active = true AND p.id != NEW.raised_by;

  INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
  SELECT p.id,
    '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
      || NEW.entity_type || ' "' || NEW.entity_name || '"',
    'update', NEW.id, 'issue'
  FROM public.profiles p
  WHERE p.role = 'teamLead' AND p.department = NEW.department AND p.is_active = true;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_issue_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  issue_rec RECORD;
BEGIN
  SELECT * INTO issue_rec FROM public.issues WHERE id = NEW.issue_id;
  INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
  VALUES (
    issue_rec.raised_by,
    '💬 ' || NEW.replied_by_name || ' replied to your issue: "' || issue_rec.title || '"',
    'update', NEW.issue_id, 'issue'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_issue_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
    VALUES (
      OLD.raised_by,
      '✅ Your issue "' || NEW.title || '" has been resolved. Note: '
        || COALESCE(NEW.resolution_note, 'No note provided.'),
      'completion', NEW.id, 'issue'
    );
  END IF;
  RETURN NEW;
END;
$$;


-- ── RLS: tighten audit_logs INSERT policy ────────────────────────────────────
-- Replace WITH CHECK (true) so users can only insert rows they performed.
-- audit_logs.performed_by is the actor column.
DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
CREATE POLICY "audit_insert"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());
