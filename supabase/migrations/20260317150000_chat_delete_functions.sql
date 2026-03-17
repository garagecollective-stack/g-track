-- RPC functions for message deletion
-- Using SECURITY DEFINER + RETURNS void avoids PostgREST's "row no longer visible" 403 error
-- that occurs when RLS SELECT policy excludes the row after the UPDATE.

CREATE OR REPLACE FUNCTION public.chat_delete_for_me(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE chat_messages
  SET deleted_for_sender = true
  WHERE id = p_message_id
    AND sender_id = auth.uid()
    AND room_id IN (SELECT my_chat_room_ids());
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_delete_for_everyone(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE chat_messages
  SET deleted_for_everyone = true,
      message = 'This message was deleted'
  WHERE id = p_message_id
    AND sender_id = auth.uid()
    AND room_id IN (SELECT my_chat_room_ids());
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_delete_for_me(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_delete_for_everyone(uuid) TO authenticated;
