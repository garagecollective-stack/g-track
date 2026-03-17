-- Fix infinite recursion in chat RLS policies
-- chat_room_members policy was self-referencing, causing 500 errors.
-- Solution: security-definer function that bypasses RLS to get the caller's room IDs.

CREATE OR REPLACE FUNCTION public.my_chat_room_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT room_id FROM public.chat_room_members WHERE user_id = auth.uid();
$$;

-- ── chat_rooms ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members can view rooms"  ON public.chat_rooms;
DROP POLICY IF EXISTS "members can create rooms" ON public.chat_rooms;

CREATE POLICY "members can view rooms" ON public.chat_rooms
  FOR SELECT USING (id IN (SELECT public.my_chat_room_ids()));

CREATE POLICY "members can create rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── chat_room_members ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "view room members" ON public.chat_room_members;
DROP POLICY IF EXISTS "join rooms"        ON public.chat_room_members;
DROP POLICY IF EXISTS "update own read"   ON public.chat_room_members;

CREATE POLICY "view room members" ON public.chat_room_members
  FOR SELECT USING (room_id IN (SELECT public.my_chat_room_ids()));

CREATE POLICY "join rooms" ON public.chat_room_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update own read" ON public.chat_room_members
  FOR UPDATE USING (user_id = auth.uid());

-- ── chat_messages ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "view messages in joined rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "send messages to joined rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "update own messages"           ON public.chat_messages;

CREATE POLICY "view messages in joined rooms" ON public.chat_messages
  FOR SELECT USING (room_id IN (SELECT public.my_chat_room_ids()));

CREATE POLICY "send messages to joined rooms" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND room_id IN (SELECT public.my_chat_room_ids())
  );

CREATE POLICY "update own messages" ON public.chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- ── chat_typing ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "view typing in joined rooms" ON public.chat_typing;
DROP POLICY IF EXISTS "upsert own typing"           ON public.chat_typing;
DROP POLICY IF EXISTS "delete own typing"           ON public.chat_typing;

CREATE POLICY "view typing in joined rooms" ON public.chat_typing
  FOR SELECT USING (room_id IN (SELECT public.my_chat_room_ids()));

CREATE POLICY "upsert own typing" ON public.chat_typing
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "delete own typing" ON public.chat_typing
  FOR DELETE USING (user_id = auth.uid());
