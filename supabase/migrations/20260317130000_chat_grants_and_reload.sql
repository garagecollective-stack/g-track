-- Grant table access to authenticated users (new tables don't inherit this automatically)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_room_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_typing       TO authenticated;

-- Grant usage on sequences (needed for uuid default gen — belt & suspenders)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Fix search_path on security-definer function so auth.uid() always resolves
CREATE OR REPLACE FUNCTION public.my_chat_room_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT room_id FROM public.chat_room_members WHERE user_id = auth.uid();
$$;

-- Reload PostgREST schema cache so new FK relationships are visible
NOTIFY pgrst, 'reload schema';
