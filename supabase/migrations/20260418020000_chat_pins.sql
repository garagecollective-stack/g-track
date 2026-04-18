-- ═══════════════════════════════════════════════════════════════════════════
-- Chat · Pinned messages
-- A member of a room can pin/unpin any message in that room. Pins surface in
-- a shelf at the top of the channel. No limit.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_pinned        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at        timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_pinned
  ON public.chat_messages(room_id)
  WHERE is_pinned = true;

-- ── RPC: toggle pin for a message (any room member) ──────────────────────────

CREATE OR REPLACE FUNCTION public.chat_toggle_pin(
  p_message_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_room_id  uuid;
  v_pinned   boolean;
  v_is_member boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT room_id, is_pinned INTO v_room_id, v_pinned
  FROM public.chat_messages WHERE id = p_message_id;

  IF v_room_id IS NULL THEN RAISE EXCEPTION 'message not found'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.chat_room_members
    WHERE room_id = v_room_id AND user_id = v_uid
  ) INTO v_is_member;

  IF NOT v_is_member THEN RAISE EXCEPTION 'not a room member'; END IF;

  IF v_pinned THEN
    UPDATE public.chat_messages
    SET is_pinned = false, pinned_at = NULL, pinned_by = NULL
    WHERE id = p_message_id;
    RETURN false;
  ELSE
    UPDATE public.chat_messages
    SET is_pinned = true, pinned_at = now(), pinned_by = v_uid
    WHERE id = p_message_id;
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_toggle_pin(uuid) TO authenticated;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
