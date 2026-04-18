-- ═══════════════════════════════════════════════════════════════════════════
-- Chat · Group management RPCs
-- Edit name/emoji, add/remove members, leave, delete — creator-admin model.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── chat_update_group: creator updates name / emoji ───────────────────────────

CREATE OR REPLACE FUNCTION public.chat_update_group(
  p_room_id      uuid,
  p_name         text DEFAULT NULL,
  p_avatar_emoji text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_creator uuid;
  v_type    text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT created_by, type INTO v_creator, v_type
  FROM public.chat_rooms WHERE id = p_room_id;

  IF v_creator IS NULL THEN RAISE EXCEPTION 'group not found'; END IF;
  IF v_type <> 'group' THEN RAISE EXCEPTION 'not a group'; END IF;
  IF v_creator <> v_uid THEN RAISE EXCEPTION 'only the group creator can edit'; END IF;

  UPDATE public.chat_rooms
  SET
    name         = COALESCE(NULLIF(trim(p_name), ''), name),
    avatar_emoji = COALESCE(p_avatar_emoji, avatar_emoji)
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_update_group(uuid, text, text) TO authenticated;

-- ── chat_add_group_members: creator bulk-adds members ────────────────────────

CREATE OR REPLACE FUNCTION public.chat_add_group_members(
  p_room_id    uuid,
  p_member_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid;
  v_creator   uuid;
  v_type      text;
  v_member_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT created_by, type INTO v_creator, v_type
  FROM public.chat_rooms WHERE id = p_room_id;

  IF v_creator IS NULL THEN RAISE EXCEPTION 'group not found'; END IF;
  IF v_type <> 'group' THEN RAISE EXCEPTION 'not a group'; END IF;
  IF v_creator <> v_uid THEN RAISE EXCEPTION 'only the group creator can add members'; END IF;

  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member_id IN ARRAY p_member_ids
    LOOP
      IF v_member_id IS NOT NULL THEN
        INSERT INTO public.chat_room_members (room_id, user_id)
        VALUES (p_room_id, v_member_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_add_group_members(uuid, uuid[]) TO authenticated;

-- ── chat_remove_group_member: creator removes others, anyone removes self ────

CREATE OR REPLACE FUNCTION public.chat_remove_group_member(
  p_room_id   uuid,
  p_member_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_creator uuid;
  v_type    text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT created_by, type INTO v_creator, v_type
  FROM public.chat_rooms WHERE id = p_room_id;

  IF v_creator IS NULL THEN RAISE EXCEPTION 'group not found'; END IF;
  IF v_type <> 'group' THEN RAISE EXCEPTION 'not a group'; END IF;

  -- Creator cannot be removed (they must delete the group instead)
  IF p_member_id = v_creator THEN
    RAISE EXCEPTION 'the group creator cannot leave; delete the group instead';
  END IF;

  -- Allowed: creator removing someone, or user removing themselves
  IF v_uid <> v_creator AND v_uid <> p_member_id THEN
    RAISE EXCEPTION 'not allowed to remove this member';
  END IF;

  DELETE FROM public.chat_room_members
  WHERE room_id = p_room_id AND user_id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_remove_group_member(uuid, uuid) TO authenticated;

-- ── chat_delete_group: creator deletes the group (cascades messages) ─────────

CREATE OR REPLACE FUNCTION public.chat_delete_group(
  p_room_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_creator uuid;
  v_type    text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT created_by, type INTO v_creator, v_type
  FROM public.chat_rooms WHERE id = p_room_id;

  IF v_creator IS NULL THEN RAISE EXCEPTION 'group not found'; END IF;
  IF v_type <> 'group' THEN RAISE EXCEPTION 'not a group'; END IF;
  IF v_creator <> v_uid THEN RAISE EXCEPTION 'only the group creator can delete this group'; END IF;

  -- ON DELETE CASCADE on chat_room_members + chat_messages takes care of cleanup
  DELETE FROM public.chat_rooms WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_delete_group(uuid) TO authenticated;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
