-- ═══════════════════════════════════════════════════════════════════════════
-- Chat · Group rooms (WhatsApp-style user-created groups)
-- Extends chat_rooms.type to include 'group' and adds an RPC to create a
-- group + seed initial members atomically.
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow 'group' as a room type
ALTER TABLE public.chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_type_check;
ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_type_check
  CHECK (type IN ('department', 'dm', 'group'));

-- Optional emoji icon for group avatar
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS avatar_emoji text;

-- ── RPC: create a group + members atomically ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.chat_create_group(
  p_name         text,
  p_member_ids   uuid[],
  p_avatar_emoji text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id   uuid;
  v_uid       uuid;
  v_member_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'group name is required';
  END IF;

  -- Create the group room
  INSERT INTO public.chat_rooms (type, name, avatar_emoji, created_by)
  VALUES ('group', trim(p_name), p_avatar_emoji, v_uid)
  RETURNING id INTO v_room_id;

  -- Creator always becomes a member
  INSERT INTO public.chat_room_members (room_id, user_id)
  VALUES (v_room_id, v_uid)
  ON CONFLICT DO NOTHING;

  -- Add each invited member (skip nulls, skip duplicates, skip creator)
  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member_id IN ARRAY p_member_ids
    LOOP
      IF v_member_id IS NOT NULL AND v_member_id <> v_uid THEN
        INSERT INTO public.chat_room_members (room_id, user_id)
        VALUES (v_room_id, v_member_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_create_group(text, uuid[], text) TO authenticated;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
