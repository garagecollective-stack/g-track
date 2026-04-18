-- ═══════════════════════════════════════════════════════════════════════════
-- Chat · Threaded replies
-- Adds thread_root_id to chat_messages (self-ref) so replies can be grouped
-- out of the main feed and surfaced in a dedicated thread panel. Also adds
-- per-user thread read tracking so we can show unread badges on roots.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS thread_root_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_root
  ON public.chat_messages(thread_root_id)
  WHERE thread_root_id IS NOT NULL;

-- Per-user, per-thread read cursor. Any message in the thread newer than
-- last_read_at (and not authored by the user) counts as unread.
CREATE TABLE IF NOT EXISTS public.chat_thread_reads (
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_root_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  last_read_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_root_id)
);

ALTER TABLE public.chat_thread_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thread_reads_select_own" ON public.chat_thread_reads;
CREATE POLICY "thread_reads_select_own" ON public.chat_thread_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "thread_reads_all_own" ON public.chat_thread_reads;
CREATE POLICY "thread_reads_all_own" ON public.chat_thread_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.chat_thread_reads TO authenticated;

-- RPC: mark a thread as read up to "now"
CREATE OR REPLACE FUNCTION public.chat_mark_thread_read(p_thread_root_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.chat_thread_reads (user_id, thread_root_id, last_read_at)
  VALUES (auth.uid(), p_thread_root_id, now())
  ON CONFLICT (user_id, thread_root_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_mark_thread_read(uuid) TO authenticated;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
