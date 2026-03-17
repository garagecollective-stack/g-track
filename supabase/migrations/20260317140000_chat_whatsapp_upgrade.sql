-- WhatsApp-style upgrade: delete-for-me, delete-for-everyone, read receipts

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS deleted_for_everyone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for_sender   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at            timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_to         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS read_by              jsonb NOT NULL DEFAULT '[]'::jsonb;

-- SELECT: hide messages deleted for everyone, and hide from sender when deleted_for_sender
DROP POLICY IF EXISTS "view messages in joined rooms"  ON public.chat_messages;
DROP POLICY IF EXISTS "messages_select"                ON public.chat_messages;

CREATE POLICY "messages_select" ON public.chat_messages FOR SELECT TO authenticated
  USING (
    room_id IN (SELECT public.my_chat_room_ids())
    AND deleted_for_everyone = false
    AND (deleted_for_sender = false OR sender_id != auth.uid())
  );

-- UPDATE: any room member can update (needed for read_by, delivered_to, reactions)
DROP POLICY IF EXISTS "update own messages"     ON public.chat_messages;
DROP POLICY IF EXISTS "messages_update_own"     ON public.chat_messages;

CREATE POLICY "messages_update_own" ON public.chat_messages FOR UPDATE TO authenticated
  USING (room_id IN (SELECT public.my_chat_room_ids()));
