-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type IN ('department', 'dm')),
  department  text,
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_room_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message      text NOT NULL,
  reply_to_id  uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  reactions    jsonb NOT NULL DEFAULT '{}',
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_typing (
  room_id     uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id    ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user   ON public.chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room   ON public.chat_room_members(room_id);

-- ── Enable Realtime ───────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.chat_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_typing       ENABLE ROW LEVEL SECURITY;

-- chat_rooms
DROP POLICY IF EXISTS "members can view rooms"  ON public.chat_rooms;
DROP POLICY IF EXISTS "members can create rooms" ON public.chat_rooms;

CREATE POLICY "members can view rooms" ON public.chat_rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM public.chat_room_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members can create rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- chat_room_members
DROP POLICY IF EXISTS "view room members" ON public.chat_room_members;
DROP POLICY IF EXISTS "join rooms"        ON public.chat_room_members;
DROP POLICY IF EXISTS "update own read"   ON public.chat_room_members;

CREATE POLICY "view room members" ON public.chat_room_members
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM public.chat_room_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "join rooms" ON public.chat_room_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update own read" ON public.chat_room_members
  FOR UPDATE USING (user_id = auth.uid());

-- chat_messages
DROP POLICY IF EXISTS "view messages in joined rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "send messages to joined rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "update own messages"           ON public.chat_messages;

CREATE POLICY "view messages in joined rooms" ON public.chat_messages
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM public.chat_room_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "send messages to joined rooms" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    room_id IN (
      SELECT room_id FROM public.chat_room_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "update own messages" ON public.chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- chat_typing
DROP POLICY IF EXISTS "view typing in joined rooms" ON public.chat_typing;
DROP POLICY IF EXISTS "upsert own typing"           ON public.chat_typing;
DROP POLICY IF EXISTS "delete own typing"           ON public.chat_typing;

CREATE POLICY "view typing in joined rooms" ON public.chat_typing
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM public.chat_room_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "upsert own typing" ON public.chat_typing
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "delete own typing" ON public.chat_typing
  FOR DELETE USING (user_id = auth.uid());

-- ── Seed: one department room per dept, add all active members ────────────────

DO $$
DECLARE
  dept       text;
  v_room_id  uuid;
  uid        uuid;
BEGIN
  FOR dept IN
    SELECT DISTINCT department FROM public.profiles
    WHERE department IS NOT NULL AND is_active = true
  LOOP
    INSERT INTO public.chat_rooms (type, department, name)
    VALUES ('department', dept, dept || ' Chat')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_room_id;

    IF v_room_id IS NULL THEN
      SELECT id INTO v_room_id FROM public.chat_rooms
      WHERE type = 'department' AND department = dept
      LIMIT 1;
    END IF;

    FOR uid IN
      SELECT id FROM public.profiles
      WHERE department = dept AND is_active = true
    LOOP
      INSERT INTO public.chat_room_members (room_id, user_id)
      VALUES (v_room_id, uid)
      ON CONFLICT (room_id, user_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
