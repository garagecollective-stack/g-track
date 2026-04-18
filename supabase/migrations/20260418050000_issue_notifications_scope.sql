-- ============================================================
-- Scope issue notifications correctly:
--   • Task/project issues: department members + leads in same dept,
--     plus all directors/super_admins globally (DISTINCT dedupes)
--   • Todo-sourced issues: directors/super_admins only (unchanged)
-- Replaces the trigger from 20260326300000 and 20260414100000.
-- Preserves SECURITY DEFINER + SET search_path hardening.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_issue_raised()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.source = 'todo' THEN
    -- Todo-sourced issues: directors only
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
    -- Task/project issues: dept members/leads ∪ directors (DISTINCT for dedup)
    INSERT INTO public.notifications (user_id, message, type, related_id, related_type)
    SELECT DISTINCT p.id,
      '🔴 ' || NEW.raised_by_name || ' raised an issue: "' || NEW.title || '" on '
        || NEW.entity_type || ' "' || NEW.entity_name || '"',
      'issue', NEW.id, 'issue'
    FROM public.profiles p
    WHERE p.is_active = true
      AND p.id != NEW.raised_by
      AND (
        p.role IN ('director', 'super_admin')
        OR (p.role IN ('member', 'teamLead') AND p.department = NEW.department)
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_issue_raised ON public.issues;
CREATE TRIGGER on_issue_raised
  AFTER INSERT ON public.issues
  FOR EACH ROW EXECUTE PROCEDURE public.notify_issue_raised();
