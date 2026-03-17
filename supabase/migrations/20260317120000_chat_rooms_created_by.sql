-- Allow INSERT...RETURNING to work on chat_rooms.
-- PostgREST checks SELECT policy on RETURNING, but the room is just created
-- so the user has no membership row yet. Adding created_by lets us grant
-- the creator immediate SELECT access.

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE POLICY "creators can see own rooms" ON public.chat_rooms
  FOR SELECT USING (created_by = auth.uid());
